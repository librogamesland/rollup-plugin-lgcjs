/** Questa libreria si occupa di importare/esportare i file di lgc3 usando la
codifica json anziché l'xml. Gli oggetti creati sono composti da tre parti:
- info: contiene i metadati (autore, versione, ...) che in xlgc sono associati all'entità game
- entities: contiene i paragrafi e le sezioni, i codici e ogni altro dato

A differenza del formato .xlgc, qui i valori vuoti possono essere omessi. Inoltre,
le entity senza type saranno trattate come 'chapter'

Esempio di come appare un libro codificato come oggetto jlgc:
{
  "info": {
    "title": "Esempio",
    "author": "Luca Fabbian",
    "map": "/path/to/map.jpg"
  },
  "entities": {
    "1": {
      "title": "Paragrafo 1",
      "flags": ["fixed", "death", "final"],
      "data": "<p> {link 2:@T} o {link intro:Introduzione}</p>"
    },
    "2": {
      "map":
      "group": "esempio",
      "data": "<p></p>"
    },
    "intro": {
      "type" : "section",
      "title": "Introduzione",
      "data": "<p>Vai al {link 1:@T}"
    }
  },
}


*/
if(typeof DOMParser === 'undefined'){
  const JSDOM = require("jsdom").JSDOM;
  global.DOMParser = new JSDOM().window.DOMParser
}


/* DECODING
Si occupa di tradurre da .xlgc -> .jlgc. Attualmente è in grado di effettuare
una conversione completa delle funzionalità principali.

Strategia: si parte da una stringa che rappresenta lo scheletro di un file .xlgc
e la si riempie usando i dati dell'oggetto jlgc */
const decode = xlgc => {
  // Crea i tre oggetti che verranno popolati con i dati estratti dal xlgc
  const info = {},
    entities = {}

  // Usa un DOMParser per interpretare il file xml
  const xmlDoc = new DOMParser().parseFromString(xlgc, 'text/xml')
  ;[...(xmlDoc.documentElement.children ||xmlDoc.documentElement.childNodes) ].forEach(entity => {
    const id = entity.getAttribute('name')
    const type = entity.getAttribute('type')
    const group = entity.getAttribute('group')

    // L'entità game è quella contenente i metadati come autore, revisioni, ...
    // Queste informazioni vengono memorizzate all'interno di info con la stessa chiave
    if (type === 'entity' && id === 'game') {
      ;[...entity.children].forEach(node => {
        const nodeName = node.getAttribute('name')
        const nodeValue = node.innerHTML.substring(9, node.innerHTML.length - 3)
        // Whitelist delle flag riconosciute
        if (
          [
            'lgc_version',
            'title',
            'author',
            'version',
            'revision',
            'table_of_contents',
            'editing_action',
            'editing_chapter',
          ].includes(nodeName)
        )
          info[nodeName] = nodeValue
      })
      return // Termina qui, non aggiunge questa entità a section
    }

    if (type === 'entity' && id === 'map_data') {
      ;[...entity.children].forEach(node => {
        const nodeName = node.getAttribute('name')
        const nodeValue = node.innerHTML.substring(9, node.innerHTML.length - 3)
        // Whitelist delle flag riconosciute
        if (nodeName === 'map_file') info.map = nodeValue
      })
      return // Termina qui, non aggiunge questa entità a section
    }

    let section = {}
    if (group) section.group = group
    if (type && (type != 'chapter' && type != 'section'))
      section.type = type
      // Itera i nodi figli dell'entity alla ricerca di flag, titolo e contenuto
    ;[...entity.children].forEach(node => {
      const nodeName = node.getAttribute('name')
      const nodeValue = node.innerHTML.substring(9, node.innerHTML.length - 3)
      if (nodeName === 'chapter_title' && nodeValue) section.title = nodeValue
      if (nodeName === 'description') section.data = nodeValue
      if (nodeName === 'map_position') section.map = nodeValue
      if (nodeName.startsWith('flag_') && nodeValue === 'true') {
        if (!section.flags) section.flags = [] // Crea l'array in cui conservare le flag
        section.flags.push(nodeName.substring(5)) // Aggiunge la flag
      }
    })
    // Inserisce nel jlgc l'oggetto section appena creato
    entities[id] = section
  })

  return { info, entities }
}

/* ENCODING
Si occupa di tradurre da .jlgc -> .xlgc. Attualmente è in grado di effettuare
una conversione completa delle funzionalità principali.

Strategia: si parte da una stringa che rappresenta lo scheletro di un file .xlgc
e la si riempie usando i dati dell'oggetto jlgc */

function isNaturalNumber(n) {
    n = n.toString(); // force the value incase it is not
    var n1 = Math.abs(n),
        n2 = parseInt(n, 10);
    return !isNaN(n1) && n2 === n1 && n1.toString() === n;
}

// Crea la sezione "game" con i metadati in info
const encodeInfo = info =>
  `<entity group="setup" name="game" type="entity">` +
  `<attribute name="description" type="string"><![CDATA[<p></p>]]></attribute>` +
  `<attribute name="chapter_title" type="string"/>` +
  `<attribute name="lgc_version" type="string"><![CDATA[${info.lgc_version ||
    ''}]]></attribute>` +
  `<attribute name="title" type="string"><![CDATA[${info.title ||
    ''}]]></attribute>` +
  `<attribute name="author" type="string"><![CDATA[${info.author ||
    ''}]]></attribute>` +
  `<attribute name="version" type="string"><![CDATA[${info.version ||
    ''}]]></attribute>` +
  `<attribute name="revision" type="integer"><![CDATA[${info.revision ||
    '1'}]]></attribute>` +
  `<attribute name="editing_action" type="string"><![CDATA[${info.editing_action ||
    'WRITING'}]]></attribute>` +
  `<attribute name="table_of_contents" type="string"><![CDATA[${info.table_of_contents ||
    'P(ALL)'}]]></attribute>` +
  `<attribute name="editing_chapter" type="string"><![CDATA[${info.editing_chapter ||
    '1'}]]></attribute>` +
  `</entity>`

const encodeMap = info =>
  !info.map
    ? ''
    : `<entity group="setup" name="map_data" type="entity">` +
      `<attribute name="description" type="string"><![CDATA[<p></p>]]></attribute>` +
      `<attribute name="chapter_title" type="string"/>` +
      `<attribute name="map_file" type="string"><![CDATA[${info.map}]]></attribute>` +
      `</entity>`

// Crea una sezione/paragrafo
const encodeEntity = (id, entity) =>
  `<entity group="${entity.group || ''}" name="${id}" type="${entity.type ||
    isNaturalNumber(id) ? 'chapter' : 'section'}">` +
  `<attribute name="description" type="string"><![CDATA[${entity.data ||
    '<p></p>'}]]></attribute>` +
  `<attribute name="chapter_title" type="string"><![CDATA[${entity.title ||
    ''}]]></attribute>` +
  `${
    entity.type && entity.type !== 'chapter'
      ? ''
      : `<attribute name="flag_final" type="boolean"><![CDATA[${
          entity.flags && entity.flags.includes('final') ? 'true' : 'false'
        }]]></attribute>` +
        `<attribute name="flag_fixed" type="boolean"><![CDATA[${
          entity.flags && entity.flags.includes('fixed') ? 'true' : 'false'
        }]]></attribute>` +
        `<attribute name="flag_death" type="boolean"><![CDATA[${
          entity.flags && entity.flags.includes('death') ? 'true' : 'false'
        }]]></attribute>`
  }` +
  (!entity.map
    ? ''
    : `<attribute name="map_position" type="string"><![CDATA[${entity.map ||
        ''}]]></attribute>`) +
  `</entity>`

// Codifica il libro
const encode = jlgc =>
  `<?xml version="1.0" encoding="UTF-8"?><entities>${encodeInfo(jlgc.info) +
    encodeMap(jlgc.info) +
    Object.entries(jlgc.entities).reduce(
      (acc, curr) => acc + encodeEntity(...curr),
      ''
    )}</entities>`

/* Esporta solo le due funzioni per la decodifica/codifica */
export { decode, encode }
