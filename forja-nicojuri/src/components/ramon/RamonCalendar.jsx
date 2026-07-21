// Calendario universitario de Ramón (hardcodeado desde su horario oficial)

const RAMOS = {
  calculo: { name: 'CÁLCULO II [TEO 3]',            prof: 'Williams Alejandro Canales Verdugo', color: '#00d4ff' },
  ia:      { name: 'INTR INTELI ARTIFICIAL [LAB 4]', prof: 'Fernando Enrique Peralta Pinilla',   color: '#b39ddb' },
  ingles:  { name: 'LEX3 CS.ING INGLES [TEO 7]',     prof: 'Alejandra Elisa Galindo Vives',      color: '#ffc107' },
  iot:     { name: 'PROGRAMACIÓN IOT [LAB 1]',       prof: 'Agustín Andrés Díaz Salazar',        color: '#00e676' },
  redes:   { name: 'REDES [LAB 4]',                  prof: 'Miguel Angel Castillo Leiva',        color: '#ff7043' },
  cloud:   { name: 'TECNOLOGÍAS CLOUD [LAB 3]',      prof: 'Felipe Alberto Murcia Mesa',         color: '#4fc3f7' },
  etica:   { name: 'FORM.ÉTI.DES.SOST. [TEO 37]',    prof: 'Juan Pablo Siccardi',                color: '#f06292' },
}

const SLOTS = [
  { time: '11:30 - 12:10' },
  { time: '12:10 - 12:50' },
  { time: '12:50 - 13:10', isBreak: true },
  { time: '13:10 - 13:50' },
  { time: '13:50 - 14:30' },
  { time: '14:30 - 14:40', isBreak: true },
  { time: '14:40 - 15:20' },
  { time: '15:20 - 16:00' },
  { time: '16:00 - 16:10', isBreak: true },
  { time: '16:10 - 16:50' },
  { time: '16:50 - 17:30' },
  { time: '17:30 - 18:10' },
]

const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

const LAB_REDES = 'LAB. REDES 3 (EX B17)'
const LIVING_LAB = 'LAB. PC LIVING-LAB'

// horario[dia][indiceSlot] = [ramo, sala]
const HORARIO = {
  lunes: {
    0: ['calculo', 'R301'],
    1: ['calculo', 'R301'],
    4: ['iot', LIVING_LAB],
    6: ['iot', LIVING_LAB],
    7: ['iot', LIVING_LAB],
    10: ['etica', 'D-13'],
    11: ['etica', 'D-13'],
  },
  martes: {
    0: ['ia', LAB_REDES],
    1: ['ia', LAB_REDES],
    4: ['redes', LAB_REDES],
    6: ['redes', LAB_REDES],
    7: ['redes', LAB_REDES],
    9: ['cloud', LAB_REDES],
    10: ['cloud', LAB_REDES],
    11: ['cloud', LAB_REDES],
  },
  miercoles: {},
  jueves: {
    1: ['ingles', 'LRC'],
    3: ['ingles', 'LRC'],
    4: ['ingles', 'LRC'],
    9: ['calculo', 'F-15'],
    10: ['calculo', 'F-15'],
  },
  viernes: {},
}

export default function RamonCalendar() {
  return (
    <div className="ap-section">
      <h2 className="ap-section-title">Calendario de Ramón</h2>
      <div className="rc-scroll">
        <table className="rc-table">
          <thead>
            <tr>
              <th className="rc-time-col"></th>
              {DAYS.map(d => (
                <th key={d} className="rc-day">{d === 'miercoles' ? 'miércoles' : d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, i) => (
              <tr key={slot.time} className={slot.isBreak ? 'rc-break' : ''}>
                <td className="rc-time">{slot.time}</td>
                {DAYS.map(day => {
                  const entry = HORARIO[day][i]
                  if (slot.isBreak || !entry) return <td key={day} />
                  const [ramoKey, sala] = entry
                  const ramo = RAMOS[ramoKey]
                  return (
                    <td key={day}>
                      <div className="rc-class" style={{ '--rc-color': ramo.color }}>
                        <strong>{ramo.name}</strong>
                        <span>{ramo.prof}</span>
                        <em>SALA: {sala}</em>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
