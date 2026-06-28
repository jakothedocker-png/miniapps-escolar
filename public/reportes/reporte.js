// UBICACIÓN: reportes/reporte.js
import { db } from '../js/firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const cct = params.get('cct');
    const grado = params.get('grado');
    const grupo = params.get('grupo');
    const periodo = parseInt(params.get('periodo'));

    if(!cct || !grado || !grupo) return;

    // Títulos de Encabezado dinámicos
    const nombresTrimestres = { 0: "EXAMEN DE DIAGNÓSTICO", 1: "PRIMER TRIMESTRE", 2: "SEGUNDO TRIMESTRE", 3: "TERCER TRIMESTRE" };
    setText('titulo-trimestre-tabla', nombresTrimestres[periodo] || `TRIMESTRE ${periodo}`);
    setText('dato-grado', `${grado}°`);
    setText('dato-grupo', `"${grupo}"`);

    const now = new Date();
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const fechaStr = `${now.getDate()} DE ${meses[now.getMonth()]} DE ${now.getFullYear()}`;

    try {
        const [docSchool, docConfig] = await Promise.all([
            getDoc(doc(db, "escuelas", cct)),
            getDoc(doc(db, "configuracion", "general"))
        ]);

        const schoolData = docSchool.exists() ? docSchool.data() : { nombre: "ESCUELA", comunidad: "MÉXICO" };
        const configData = docConfig.exists() ? docConfig.data() : {};

        setText('static-nombre-escuela', schoolData.nombre);
        setText('static-cct', cct);
        setText('static-domicilio', schoolData.direccion || '');
        setText('static-localidad', schoolData.comunidad || '');
        setText('static-turno', schoolData.turno || 'MATUTINO');
        
        let fechaImpresion = configData.fecha_impresion || fechaStr;
        const loc = (schoolData.comunidad || "LUGAR").toUpperCase();
        const mun = (schoolData.municipio || "MUNICIPIO").toUpperCase();
        setText('dato-lugar-fecha', `${loc}, ${mun}, MÉXICO A ${fechaImpresion}.`);

        let dirName = "__________________________";
        const qDir = query(collection(db, "usuarios"), where("cct", "==", cct), where("rol", "==", "director"));
        const snapDir = await getDocs(qDir);
        if(!snapDir.empty) dirName = snapDir.docs[0].data().nombre;
        setText('nombre-director', `MTRO(A). ${dirName}`);

        let profName = "__________________________";
        const grupoBuscado = `${grado}-${grupo}`;
        const qProf = query(collection(db, "usuarios"), where("cct", "==", cct), where("rol", "==", "docente"), where("grupos_asignados", "array-contains", grupoBuscado));
        const snapProf = await getDocs(qProf);
        if(!snapProf.empty) profName = snapProf.docs[0].data().nombre;
        setText('nombre-docente', `MTRO(A). ${profName}`);

        const qAlumnos = query(collection(db, "alumnos"), where("cct", "==", cct), where("grado", "==", grado), where("grupo", "==", grupo), orderBy("nombre"));
        const snapAlumnos = await getDocs(qAlumnos);

        const qEvals = query(collection(db, "evaluaciones"), where("cct", "==", cct), where("periodo", "==", periodo), where("grado", "==", grado), where("grupo", "==", grupo));
        const snapEvals = await getDocs(qEvals);
        const mapEvals = {};
        snapEvals.forEach(doc => mapEvals[doc.data().alumno_uid] = doc.data());

        const tbody = document.getElementById('cuerpo-tabla');
        tbody.innerHTML = '';

        let i = 1;
        let colSums = { l:0, s:0, e:0, h:0, prom:0 };
        let colCounts = { l:0, s:0, e:0, h:0, prom:0 };
        let stats = { 10:0, 9:0, 8:0, 7:0, 6:0, 5:0, total:0 };
        let sumPromFinal = 0; let countPromFinal = 0;

        // Helper de Redondeo Aritmético Estándar
        const numDecimals = periodo === 0 ? 2 : 1;
        const roundStandard = (val, decimals) => {
            if (val === undefined || val === null || val === '' || val === '-') return '';
            const rounded = Number(Math.round(parseFloat(val) + 'e' + decimals) + 'e-' + decimals);
            return rounded.toFixed(decimals);
        };

        snapAlumnos.forEach(doc => {
            const al = doc.data();
            const ev = mapEvals[doc.id] || {};
            const extras = getDataFromCURP(al.curp);

            const l = ev.lenguajes;
            const s = ev.saberes;
            const e_ = ev.etica;
            const h = ev.humanos;
            const prom = ev.promedio;

            if(l !== undefined && l !== null && l !== '') { colSums.l += parseFloat(l); colCounts.l++; }
            if(s !== undefined && s !== null && s !== '') { colSums.s += parseFloat(s); colCounts.s++; }
            if(e_ !== undefined && e_ !== null && e_ !== '') { colSums.e += parseFloat(e_); colCounts.e++; }
            if(h !== undefined && h !== null && h !== '') { colSums.h += parseFloat(h); colCounts.h++; }

            if (prom !== undefined && prom !== null && prom !== '') {
                const promFloat = parseFloat(prom);
                sumPromFinal += promFloat; countPromFinal++; stats.total++;
                
                // Estadística: se agrupan los promedios en enteros
                const pFloor = Math.floor(promFloat);
                if (pFloor >= 10) stats[10]++; 
                else if (pFloor === 9) stats[9]++; 
                else if (pFloor === 8) stats[8]++; 
                else if (pFloor === 7) stats[7]++; 
                else if (pFloor === 6) stats[6]++; 
                else stats[5]++; // Diagnósticos menores a 5 se suman al último bloque para no romper tu tabla
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i++}</td>
                <td class="col-nombre">${al.nombre}</td>
                <td>${extras.sexo}</td>
                <td>${extras.edad}</td>
                <td>${ev.inasistencias || 0}</td>
                <td>${roundStandard(l, numDecimals)}</td>
                <td>${roundStandard(s, numDecimals)}</td>
                <td>${roundStandard(e_, numDecimals)}</td>
                <td>${roundStandard(h, numDecimals)}</td>
                <td class="col-prom" style="font-weight:bold;">${roundStandard(prom, numDecimals)}</td>
            `;
            tbody.appendChild(tr);
        });

        const pL = colCounts.l > 0 ? roundStandard(colSums.l/colCounts.l, numDecimals) : '-';
        const pS = colCounts.s > 0 ? roundStandard(colSums.s/colCounts.s, numDecimals) : '-';
        const pE = colCounts.e > 0 ? roundStandard(colSums.e/colCounts.e, numDecimals) : '-';
        const pH = colCounts.h > 0 ? roundStandard(colSums.h/colCounts.h, numDecimals) : '-';
        const pG = countPromFinal > 0 ? roundStandard(sumPromFinal/countPromFinal, numDecimals) : '-';

        const trProm = document.createElement('tr');
        trProm.className = 'fila-promedios';
        trProm.innerHTML = `<td colspan="5" class="label-promedio-final">PROMEDIO FINAL</td><td>${pL}</td><td>${pS}</td><td>${pE}</td><td>${pH}</td><td class="dato-promedio-general">${pG}</td>`;
        tbody.appendChild(trProm);

        setText('stat-total-alum', stats.total);
        for(let k=5; k<=10; k++) {
            setText(`stat-num-${k}`, stats[k]);
            const perc = stats.total > 0 ? ((stats[k]/stats.total)*100).toFixed(1)+'%' : '0%';
            setText(`stat-perc-${k}`, perc);
        }

        setTimeout(() => window.print(), 1000);

    } catch(e) { console.error(e); alert(e.message); }
});

function setText(id, txt) { const el = document.getElementById(id); if(el) el.textContent = txt ? String(txt).toUpperCase() : ''; }
const getDataFromCURP = (curp) => { 
    if (!curp || curp.length < 18) return { edad: '-', sexo: '-' };
    const sexo = curp.charAt(10).toUpperCase() === 'H' ? 'H' : 'M';
    const y = curp.substring(4,6), m = curp.substring(6,8), d = curp.substring(8,10);
    let year = parseInt(y) + (parseInt(y) < 30 ? 2000 : 1900);
    const birth = new Date(year, parseInt(m)-1, parseInt(d));
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if(now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
    return { edad: age, sexo: sexo };
};