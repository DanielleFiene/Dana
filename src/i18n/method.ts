import type { Lang } from "@/types/lang";

/** Hash for the method page. Bookmarkable; one click from the header. */
export const METHOD_HASH = "#method";

export const METHOD_SECTION_IDS = ["what", "peaks", "rivers", "coverage", "not", "tested"] as const;

export type MethodSectionId = (typeof METHOD_SECTION_IDS)[number];

export type MethodSection = {
  heading: string;
  body: readonly string[];
};

export type MethodCopy = {
  nav: string;
  title: string;
  back: string;
  lead: string;
  sections: Record<MethodSectionId, MethodSection>;
};

const ca: MethodCopy = {
  nav: "Mètode i límits",
  title: "Què vol dir aquest nivell",
  back: "Tornar al mapa",
  lead: "Nivell en directe: mescla ICON + ECMWF IFS. AROME només en contrast històric. Aquí la construcció del 0–4 i els modes de fallada coneguts.",
  sections: {
    what: {
      heading: "Què és el nivell",
      body: [
        "Cada hora és un nivell 0–4. Entrades en directe via Open-Meteo: ICON per a la mescla local de pluja; ECMWF IFS 0,25° per al tall (T500, z500); temperatura de la mar (SST). El patró (nucli fred, aigua en columna, mar calenta, vent de mar) es llegeix contra els mil·límetres d’aquesta mescla. Un nivell alt exigeix que el model també prevegi pluja de veritat, no només les condicions atmosfèriques adequades. La tira i el mapa pinten el dia en conjunt: una hora inestable no pinta el dia. El número és una situació, no una probabilitat d’inundació ni una instrucció.",
        "AROME França (Météo-France, Open-Meteo) és una comparació paral·lela allà on el domini cobreix el quadrat. No entra a la mescla en directe. Màlaga, Almeria i Gibraltar queden sempre fora d’aquest domini. El conjunt ECMWF IFS (51 membres) no es mostra com a probabilitat. Les estacions SAIH no entren a la nota en directe.",
      ],
    },
    peaks: {
      heading: "Els models es queden curts a les puntes locals",
      body: [
        "Al Magre (València, 29 oct 2024) AEMET Turís va mesurar uns 700–770 mm en 14 h. La mescla ICON/ECMWF al corredor va quedar unes 3× per sota. AROME s’hi acosta en algunes cel·les interiors; no tanca ~700 mm. Un color baix són els mil·límetres del model, no una garantia que a terra en caigués poc.",
      ],
    },
    rivers: {
      heading: "El riu pot pujar lluny de la pluja",
      body: [
        "El nivell i el cabal no entren a la nota en directe. Els mil·límetres locals poden semblar modestos i el riu pujar igual, perquè l’aigua arriba de més amunt de la conca, amb un retard d’hores o d’un dia (Màlaga, 13 nov 2024: ~77 mm a Cártama, pic del Guadalhorce l’endemà al matí). Això no és un motiu per baixar el llindar de pluja: hi manca l’entrada de la conca, no un model de pluja més baix. Les sèries SAIH són arxius d’episodis contrastats, no una entrada en directe.",
      ],
    },
    coverage: {
      heading: "El contrast no és uniforme",
      body: [
        "Hi ha més riuades documentades als corredors de València, Múrcia i Catalunya que a Màlaga, Almeria, Gibraltar o les Balears. Mallorca és illa, no interior de muntanya. La franja sud queda sempre fora d’AROME França: aquests quadrats no donaran mai una fila de comparació AROME. Si AROME encertaria més a l’interior és una hipòtesi de taula, no una regla de la nota, fins a una majoria de sis cel·les interiors de muntanya contrastades i independents (avui: una, Utiel–Requena).",
      ],
    },
    not: {
      heading: "Què no fa aquesta eina",
      body: [
        "No dóna una probabilitat d’inundació. No diu a ningú que marxi, que es quedi o que pugi. No substitueix els avisos d’AEMET ni el 112. És un senyal extra, personal i no comercial, no una autoritat.",
      ],
    },
    tested: {
      heading: "Encerts, falls i falses alarmes",
      body: [
        "La mescla actual s’ha tornat a passar sobre riuades documentades — Mallorca i València oct 2024, Catalunya i Màlaga nov 2024, Múrcia set 2023 — i sobre dies tranquils que havien de quedar-se tranquils. El registre inclou encerts; dies en què a terra va ploure molt més del que els models van pintar; i falses alarmes de dues menes: un efecte arrossegat d’un episodi de pluja més fort, abans, a la mateixa regió, i color que resta perquè la suma mòbil de 24 o 48 h encara porta l’aiguat anterior mentre el dia del calendari ja és quiet. L’AROME sense xifres a Múrcia set 2023 és un forat específic de l’arxiu d’AROME dins d’Open-Meteo (ICON i ECMWF d’aquell mes a Múrcia hi eren); no és un fall del model. Aquest registre no afirma que el mapa sigui complet.",
      ],
    },
  },
};

const es: MethodCopy = {
  nav: "Método y límites",
  title: "Qué significa este nivel",
  back: "Volver al mapa",
  lead: "Nivel en directo: mezcla ICON + ECMWF IFS. AROME solo en contraste histórico. Aquí la construcción del 0–4 y los modos de fallo conocidos.",
  sections: {
    what: {
      heading: "Qué es el nivel",
      body: [
        "Cada hora es un nivel 0–4. Entradas en directo vía Open-Meteo: ICON para la mezcla local de lluvia; ECMWF IFS 0,25° para el corte (T500, z500); temperatura del mar (SST). El patrón (núcleo frío, agua en columna, mar cálido, viento de mar) se lee contra los milímetros de esa mezcla. Un nivel alto exige que el modelo también prevea lluvia de verdad, no solo las condiciones atmosféricas adecuadas. La tira y el mapa pintan el día en conjunto: una hora inestable no pinta el día. El número es una situación, no una probabilidad de inundación ni una instrucción.",
        "AROME Francia (Météo-France, Open-Meteo) es una comparación paralela allí donde el dominio cubre el cuadrado. No entra en la mezcla en directo. Málaga, Almería y Gibraltar quedan siempre fuera de ese dominio. El conjunto ECMWF IFS (51 miembros) no se muestra como probabilidad. Las estaciones SAIH no entran en la nota en directo.",
      ],
    },
    peaks: {
      heading: "Los modelos se quedan cortos en los picos locales",
      body: [
        "En el Magre (Valencia, 29 oct 2024) AEMET Turís midió unos 700–770 mm en 14 h. La mezcla ICON/ECMWF en el corredor quedó unas 3× por debajo. AROME se acerca en algunas celdas interiores; no cierra ~700 mm. Un color bajo son los milímetros del modelo, no una garantía de que en el suelo cayera poco.",
      ],
    },
    rivers: {
      heading: "El río puede subir lejos de la lluvia",
      body: [
        "El nivel y el caudal no entran en la nota en directo. Los milímetros locales pueden parecer modestos y el río subir igual, porque el agua llega de más arriba de la cuenca, con un retraso de horas o de un día (Málaga, 13 nov 2024: ~77 mm en Cártama, pico del Guadalhorce a la mañana siguiente). Eso no es un motivo para bajar el umbral de lluvia: falta la entrada de la cuenca, no un modelo de lluvia más bajo. Las series SAIH son archivos de episodios contrastados, no una entrada en directo.",
      ],
    },
    coverage: {
      heading: "El contraste no es uniforme",
      body: [
        "Hay más riadas documentadas en los corredores de Valencia, Murcia y Cataluña que en Málaga, Almería, Gibraltar o Baleares. Mallorca es isla, no interior de montaña. La franja sur queda siempre fuera de AROME Francia: esos cuadrados no darán nunca una fila de comparación AROME. Si AROME acertaría más tierra adentro es una hipótesis de tabla, no una regla de la nota, hasta una mayoría de seis celdas interiores de montaña contrastadas e independientes (hoy: una, Utiel–Requena).",
      ],
    },
    not: {
      heading: "Qué no hace esta herramienta",
      body: [
        "No da una probabilidad de inundación. No dice a nadie que se vaya, que se quede o que suba. No sustituye los avisos de AEMET ni el 112. Es una señal extra, personal y no comercial, no una autoridad.",
      ],
    },
    tested: {
      heading: "Aciertos, fallos y falsas alarmas",
      body: [
        "La mezcla actual se ha vuelto a pasar sobre riadas documentadas — Mallorca y Valencia oct 2024, Cataluña y Málaga nov 2024, Murcia sep 2023 — y sobre días tranquilos que debían quedarse tranquilos. El registro incluye aciertos; días en que en el suelo llovió mucho más de lo que pintaron los modelos; y falsas alarmas de dos tipos: un efecto arrastrado de un episodio de lluvia más fuerte, antes, en la misma región, y color que queda porque la suma móvil de 24 o 48 h aún lleva el aguacero anterior mientras el día del calendario ya está quieto. El AROME sin cifras en Murcia sep 2023 es un hueco específico del archivo de AROME dentro de Open-Meteo (ICON y ECMWF de ese mes en Murcia sí estaban); no es un fallo del modelo. Ese registro no afirma que el mapa esté completo.",
      ],
    },
  },
};

const en: MethodCopy = {
  nav: "Method and limits",
  title: "What this level means",
  back: "Back to the map",
  lead: "Live level: ICON + ECMWF IFS mix. AROME is historical comparison only. This is how the 0–4 is built, and where it is known to fail.",
  sections: {
    what: {
      heading: "What the level is",
      body: [
        "Each hour is a level 0–4. Live inputs via Open-Meteo: ICON for the local rain mix; ECMWF IFS 0.25° for the cut-off (T500, z500); sea-surface temperature (SST). The pattern (cold core, column water, warm sea, onshore wind) is read against millimetres in that mix. A high level requires that the model also actually forecasts rain, not only the right atmospheric conditions. Strip and map colour the day as a whole: one unsettled hour does not paint the day. The number is a situation, not a flood probability and not an instruction.",
        "AROME France (Météo-France, Open-Meteo) is a parallel comparison where the domain covers the square. It is not in the live mix. Málaga, Almería and Gibraltar are always outside that domain. The ECMWF IFS ensemble (51 members) is not shown as a probability. SAIH gauges are not in the live score.",
      ],
    },
    peaks: {
      heading: "Models miss the worst local peaks",
      body: [
        "On Magre (Valencia, 29 Oct 2024) AEMET Turís recorded ~700–770 mm in 14 h. The ICON/ECMWF mix on the corridor was about 3× short. AROME was less wrong on some inland cells; it still did not close ~700 mm. A low colour is the model's millimetres, not a guarantee that little rain fell on the ground.",
      ],
    },
    rivers: {
      heading: "Rivers can rise far from the rain",
      body: [
        "Stage and flow are not in the live score. Local millimetres can look modest while a river still rises, because water is arriving from higher in the catchment, hours to a day later (Málaga, 13 Nov 2024: ~77 mm at Cártama, Guadalhorce peak the next morning). That is not a reason to lower the rain threshold: the missing input is the catchment, not a wetter rain model. SAIH series are archives of checked events, not a live input.",
      ],
    },
    coverage: {
      heading: "Coverage is uneven",
      body: [
        "There are more documented floods on the Valencia, Murcia and Catalonia corridors than on Málaga, Almería, Gibraltar or the Balearics. Mallorca is an island, not inland mountains. The south belt is always outside AROME France: those squares will never yield an AROME comparison row. Whether AROME would score better inland is a table hypothesis, not a scoring rule, until a majority of six independent inland mountain cells have been checked (today: one, Utiel–Requena).",
      ],
    },
    not: {
      heading: "What this tool does not do",
      body: [
        "It does not produce a flood probability. It does not tell anyone to leave, stay, or go upstairs. It does not replace AEMET warnings or 112. It is a personal, non-commercial extra signal, not an authority.",
      ],
    },
    tested: {
      heading: "Hits, misses, and false alarms",
      body: [
        "The current mix has been replayed on documented floods — Mallorca and Valencia Oct 2024, Catalonia and Málaga Nov 2024, Murcia Sep 2023 — and on quiet days that had to stay quiet. The record includes hits; days when rain on the ground was far heavier than the models painted; and false alarms of two kinds: a lingering effect of an earlier, heavier rain event in the same region, and colour that remains because the rolling 24- or 48-hour sum still holds the previous dump while the calendar day itself is already quiet. Murcia Sep 2023 with no AROME figures is a gap specifically in AROME’s archive on Open-Meteo (ICON and ECMWF for Murcia that month were present), not a miss by that model. That record is not a claim the map is complete.",
      ],
    },
  },
};

const de: MethodCopy = {
  nav: "Methode und Grenzen",
  title: "Was diese Stufe bedeutet",
  back: "Zurück zur Karte",
  lead: "Aktuelle Stufe: Mischung ICON + ECMWF IFS. AROME nur historischer Vergleich. Hier der Aufbau der 0–4 und die bekannten Fehlermodi.",
  sections: {
    what: {
      heading: "Was die Stufe ist",
      body: [
        "Jede Stunde ist eine Stufe 0–4. Aktuelle Eingänge über Open-Meteo: ICON für die lokale Regenmischung; ECMWF IFS 0,25° für das abgeschnürte Tief (T500, z500); Meeresoberflächentemperatur (SST). Das Muster (Kaltkern, Säulenwasser, warmes Meer, landwärts Wind) wird gegen Millimeter in dieser Mischung gelesen. Eine hohe Stufe verlangt, dass das Modell auch tatsächlich Regen vorhersagt, nicht nur die passenden atmosphärischen Bedingungen. Streifen und Karte färben den Tag als Ganzes: eine unruhige Stunde färbt den Tag nicht. Die Zahl ist eine Lage, keine Überflutungswahrscheinlichkeit und keine Anweisung.",
        "AROME Frankreich (Météo-France, Open-Meteo) ist ein paralleler Vergleich, wo das Modellgebiet das Quadrat deckt. Es sitzt nicht in der aktuellen Mischung. Málaga, Almería und Gibraltar liegen immer außerhalb. Das ECMWF-IFS-Ensemble (51 Mitglieder) wird nicht als Wahrscheinlichkeit gezeigt. SAIH-Pegel sitzen nicht in der aktuellen Note.",
      ],
    },
    peaks: {
      heading: "Modelle unterschätzen lokale Spitzen",
      body: [
        "Beim Magre (Valencia, 29. Okt. 2024) maß AEMET Turís ~700–770 mm in 14 h. Die ICON/ECMWF-Mischung im Korridor lag etwa 3× darunter. AROME kommt auf manchen Binnenzellen näher; ~700 mm schließt es nicht. Eine niedrige Farbe sind Modellmillimeter, keine Garantie, dass am Boden wenig fiel.",
      ],
    },
    rivers: {
      heading: "Der Fluss kann weit vom Regen steigen",
      body: [
        "Wasserstand und Abfluss sitzen nicht in der aktuellen Note. Lokale Millimeter können bescheiden wirken, während der Fluss trotzdem steigt, weil Wasser von weiter oben im Einzugsgebiet kommt, Stunden bis einen Tag später (Málaga, 13. Nov. 2024: ~77 mm in Cártama, Guadalhorce-Spitze am nächsten Morgen). Das ist kein Grund, die Regenschwelle zu senken: es fehlt der Einzugsgebietseingang, nicht ein nasseres Regenmodell. SAIH-Reihen sind Archive geprüfter Ereignisse, kein aktueller Eingang.",
      ],
    },
    coverage: {
      heading: "Der Abgleich ist ungleich",
      body: [
        "Es gibt mehr dokumentierte Hochwasser auf den Korridoren Valencia, Murcia und Katalonien als in Málaga, Almería, Gibraltar oder auf den Balearen. Mallorca ist Insel, nicht Bergland im Binnenland. Der Südgürtel liegt immer außerhalb von AROME Frankreich: diese Quadrate liefern nie eine AROME-Vergleichszeile. Ob AROME im Binnenland besser treffen würde, ist eine Tabellenhypothese, keine Regel der Note, bis eine Mehrheit von sechs unabhängigen, geprüften Bergland-Zellen im Binnenland vorliegt (heute: eine, Utiel–Requena).",
      ],
    },
    not: {
      heading: "Was dieses Werkzeug nicht tut",
      body: [
        "Es liefert keine Überflutungswahrscheinlichkeit. Es sagt niemandem, zu gehen, zu bleiben oder nach oben zu gehen. Es ersetzt keine AEMET-Warnungen und nicht 112. Es ist ein persönliches, nicht-kommerzielles Zusatzsignal, keine Behörde.",
      ],
    },
    tested: {
      heading: "Treffer, Fehlschläge und Fehlalarme",
      body: [
        "Die jetzige Mischung wurde an dokumentierten Hochwassern erneut durchgerechnet — Mallorca und Valencia Okt. 2024, Katalonien und Málaga Nov. 2024, Murcia Sep. 2023 — und an ruhigen Tagen, die ruhig bleiben sollten. Im Protokoll: Treffer; Tage, an denen am Boden weit mehr Regen fiel, als die Modelle malten; und Fehlalarme zweierlei Art: ein Nachwirken eines früheren, stärkeren Regenereignisses in derselben Region, und Farbe, die bleibt, weil die rollierende 24- oder 48-Stunden-Summe den vorigen Schwall noch trägt, während der Kalendertag selbst schon ruhig ist. AROME ohne Zahlen in Murcia Sep. 2023 ist eine Lücke speziell im AROME-Archiv bei Open-Meteo (ICON und ECMWF für Murcia in jenem Monat waren da), kein Fehlschlag dieses Modells. Das Protokoll behauptet nicht, die Karte sei vollständig.",
      ],
    },
  },
};

const nl: MethodCopy = {
  nav: "Methode en beperkingen",
  title: "Wat dit niveau betekent",
  back: "Terug naar de kaart",
  lead: "Actueel niveau: combinatie ICON + ECMWF IFS. AROME alleen historische vergelijking. Hier de opbouw van 0–4, en de bekende foutmodi.",
  sections: {
    what: {
      heading: "Wat het niveau is",
      body: [
        "Elk uur is een niveau 0–4. Actuele invoer via Open-Meteo: ICON voor de lokale regencombinatie; ECMWF IFS 0,25° voor de afgesnoerde koudekern (T500, z500); zeewatertemperatuur (SST). Het patroon (koude kern, kolomwater, warme zee, aanlandige wind) wordt gelezen tegen millimeters in die combinatie. Een hoog niveau vereist dat het model ook echt regen voorspelt, niet alleen de juiste atmosferische omstandigheden. Strook en kaart kleuren de dag als geheel: één onbestendig uur kleurt de dag niet. Het cijfer is een situatie, geen overstromingskans en geen instructie.",
        "AROME Frankrijk (Météo-France, Open-Meteo) is een parallelle vergelijking waar het modelgebied het vakje dekt. Het zit niet in de actuele combinatie. Málaga, Almería en Gibraltar liggen altijd buiten dat gebied. Het ECMWF-IFS-ensemble (51 leden) wordt niet als kans getoond. SAIH-stations zitten niet in de actuele score.",
      ],
    },
    peaks: {
      heading: "Modellen missen de zwaarste lokale pieken",
      body: [
        "Op Magre (Valencia, 29 okt 2024) mat AEMET Turís ~700–770 mm in 14 uur. De ICON/ECMWF-combinatie op de strook bleef ongeveer 3× te laag. AROME zat op sommige cellen in het binnenland minder fout; ~700 mm haalt het niet. Een lage kleur zijn de millimeters van het model, geen garantie dat er op de grond weinig viel.",
      ],
    },
    rivers: {
      heading: "Rivieren kunnen ver van de regen stijgen",
      body: [
        "Peil en debiet zitten niet in de actuele score. Lokale millimeters kunnen mild lijken terwijl een rivier toch stijgt, omdat het water van hogerop in het stroomgebied komt, uren tot een dag later (Málaga, 13 nov 2024: ~77 mm in Cártama, Guadalhorce-piek de volgende ochtend). Dat is geen reden om de regendrempel te verlagen: wat ontbreekt is de aanvoer uit het stroomgebied, niet een natter regenmodel. SAIH-reeksen zijn archieven van getoetste gebeurtenissen, geen actuele invoer.",
      ],
    },
    coverage: {
      heading: "De toetsing is ongelijk",
      body: [
        "Er zijn meer gedocumenteerde overstromingen op de stroken Valencia, Murcia en Catalonië dan in Málaga, Almería, Gibraltar of op de Balearen. Mallorca is eiland, geen bergachtig binnenland. De zuidgordel ligt altijd buiten AROME Frankrijk: die vakjes leveren nooit een AROME-vergelijking. Of AROME in het binnenland beter zou scoren is een hypothese in de tabel, geen regel van de score, tot een meerderheid van zes onafhankelijke, getoetste bergcellen in het binnenland (nu: één, Utiel–Requena).",
      ],
    },
    not: {
      heading: "Wat dit hulpmiddel niet doet",
      body: [
        "Het geeft geen overstromingskans. Het zegt niemand dat ze weg moeten, blijven of naar boven gaan. Het vervangt geen AEMET-waarschuwingen en geen 112. Het is een extra, persoonlijk, niet-commercieel signaal, geen autoriteit.",
      ],
    },
    tested: {
      heading: "Treffers, missers en valse alarmen",
      body: [
        "De huidige combinatie is opnieuw afgedraaid op gedocumenteerde overstromingen — Mallorca en Valencia okt 2024, Catalonië en Málaga nov 2024, Murcia sep 2023 — en op rustige dagen die rustig hadden moeten blijven. Het record bevat treffers; dagen waarop de regen op de grond veel zwaarder was dan de modellen lieten zien; en valse alarmen van twee soorten: een naijleffect van een eerdere, zwaardere regenepisode in dezelfde regio, en kleur die blijft omdat de rollende 24- of 48-uursom de vorige stortbui nog meeneemt terwijl de kalenderdag zelf al stil is. Murcia sep 2023 zonder AROME-cijfers is een gat specifiek in het AROME-archief binnen Open-Meteo (ICON en ECMWF voor Murcia waren er wel), geen misser van dat model. Dat record is geen claim dat de kaart compleet is.",
      ],
    },
  },
};

const cs: MethodCopy = {
  nav: "Metoda a omezení",
  title: "Co tato úroveň znamená",
  back: "Zpět na mapu",
  lead: "Aktuální úroveň: směs ICON + ECMWF IFS. AROME jen historické srovnání. Tady stavba 0–4 a známé režimy selhání.",
  sections: {
    what: {
      heading: "Co úroveň je",
      body: [
        "Každá hodina je úroveň 0–4. Aktuální vstupy přes Open-Meteo: ICON pro místní dešťovou směs; ECMWF IFS 0,25° pro odříznuté jádro (T500, z500); teplota mořské hladiny (SST). Vzor (studené jádro, voda ve sloupci, teplé moře, vítr od moře) se čte proti milimetrům v té směsi. Vysoká úroveň vyžaduje, aby model také skutečně předpovídal déšť, nejen správné atmosférické podmínky. Pruh a mapa barví den jako celek: jedna neklidná hodina den nepřebarví. Číslo je situace, ne pravděpodobnost záplavy a ne pokyn.",
        "AROME Francie (Météo-France, Open-Meteo) je paralelní srovnání tam, kde modelová oblast pokrývá čtverec. Do aktuální směsi nevstupuje. Málaga, Almería a Gibraltar jsou vždy mimo tu oblast. Soubor ECMWF IFS (51 členů) se neukazuje jako pravděpodobnost. Stanice SAIH v aktuálním skóre nejsou.",
      ],
    },
    peaks: {
      heading: "Modely podstřelují místní špičky",
      body: [
        "U Magre (Valencie, 29. říj 2024) AEMET Turís naměřil ~700–770 mm za 14 h. Směs ICON/ECMWF na pásu zaostala asi 3×. AROME je na některých vnitrozemských buňkách méně špatný; ~700 mm nezavře. Nízká barva jsou milimetry modelu, ne záruka, že na zemi spadlo málo.",
      ],
    },
    rivers: {
      heading: "Řeka může stoupnout daleko od deště",
      body: [
        "Stav a průtok v aktuálním skóre nejsou. Místní milimetry mohou vypadat mírně, zatímco řeka přesto stoupá, protože voda přichází z výš v povodí, se zpožděním hodin až dne (Málaga, 13. lis 2024: ~77 mm v Cártamě, vrchol Guadalhorce ráno nato). To není důvod snižovat práh deště: chybí vstup z povodí, ne mokřejší dešťový model. Řady SAIH jsou archivy ověřených epizod, ne aktuální vstup.",
      ],
    },
    coverage: {
      heading: "Prověření není rovnoměrné",
      body: [
        "Je víc zdokumentovaných povodní na pásech Valencie, Murcie a Katalánska než v Málaze, Almeríi, Gibraltaru nebo na Baleárech. Mallorca je ostrov, ne horské vnitrozemí. Jižní pás je vždy mimo AROME Francii: ty čtverce nikdy nedají srovnávací řádek AROME. Zda by AROME ve vnitrozemí vycházela lépe, je tabulková hypotéza, ne pravidlo skóre, dokud nebude většina ze šesti nezávislých, ověřených horských buněk ve vnitrozemí (dnes: jedna, Utiel–Requena).",
      ],
    },
    not: {
      heading: "Co tento nástroj nedělá",
      body: [
        "Nedává pravděpodobnost záplavy. Nikomu neříká, ať odejde, zůstane, nebo jde nahoru. Nenahrazuje výstrahy AEMET ani 112. Je to osobní, nekomerční extra signál, ne autorita.",
      ],
    },
    tested: {
      heading: "Zásahy, minutí a falešné poplachy",
      body: [
        "Současná směs se znovu pustila na zdokumentovaných povodních — Mallorca a Valencie říj 2024, Katalánsko a Málaga lis 2024, Murcie zář 2023 — a na klidných dnech, které měly zůstat klidné. Záznam obsahuje zásahy; dny, kdy na zemi pršelo mnohem víc, než modely malovaly; a falešné poplachy dvou druhů: doznívající účinek dřívější, silnější dešťové události ve stejném regionu, a barva, která zbývá, protože klouzavý 24- nebo 48hodinový součet ještě nese předchozí příval, zatímco kalendářní den už je tichý. Murcia zář 2023 bez čísel AROME je mezera specificky v archivu AROME uvnitř Open-Meteo (ICON a ECMWF pro Murcii ten měsíc tam byly), ne minutí toho modelu. Ten záznam netvrdí, že mapa je úplná.",
      ],
    },
  },
};

export const methodCopy: Record<Lang, MethodCopy> = { ca, es, en, de, nl, cs };

export function isMethodHash(hash = typeof window === "undefined" ? "" : window.location.hash): boolean {
  return hash === METHOD_HASH;
}
