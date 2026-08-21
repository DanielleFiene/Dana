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
  nav: "Mètode",
  title: "Què vol dir aquest nivell",
  back: "Tornar al mapa",
  lead: "El mapa pinta una situació, hora a hora. Aquí s’explica en què es basa, i on el mètode falla de manera coneguda.",
  sections: {
    what: {
      heading: "Què és el nivell",
      body: [
        "Cada hora té un nivell de 0 a 4, fet amb models públics (ICON i ECMWF). Es busquen ingredients coneguts de DANA — aire fred a dalt, mar calenta, aire humit a baix — i es confronten amb la pluja d’aquests models. Un color alt demana pluja al model, no només un nucli fred a dalt.",
        "Un model més fi (AROME) es compara en episodis passats allà on cobreix la zona; no entra al nivell en viu. La tira i el mapa mostren el dia en conjunt: una hora inestable no pinta el dia. El número és una situació, no un percentatge ni una instrucció.",
      ],
    },
    peaks: {
      heading: "Els models es queden curts a les puntes locals",
      body: [
        "En la pluja més forta i més concentrada — com la de València l’octubre de 2024 — tots els models provats, també el més fi, van quedar molt per sota del que va caure de veritat. Els models més fins s’hi acosten; no tanquen el forat. Un nivell baix un dia així no és garantia que passi poc.",
      ],
    },
    rivers: {
      heading: "El riu pot pujar lluny de la pluja",
      body: [
        "La pluja local pot semblar modesta i el riu pujar fort igualment, perquè l’aigua arriba de més amunt de la conca, amb un retard d’hores o d’un dia. Aquesta pujada tardana del riu encara no entra al nivell.",
      ],
    },
    coverage: {
      heading: "Hi ha zones més contrastades que d’altres",
      body: [
        "València, Múrcia i Catalunya s’han contrastat amb més riuades documentades que Màlaga, Almeria, Gibraltar o les Balears. Un nivell en una zona menys contrastada descansa sobre menys casos.",
      ],
    },
    not: {
      heading: "Què no fa aquesta eina",
      body: [
        "No dóna un percentatge de probabilitat: caldrien dades que no hi són. No diu a ningú que marxi, que es quedi o que pugi amunt. No substitueix els avisos d’AEMET. És un senyal extra i obert, no una autoritat.",
      ],
    },
    tested: {
      heading: "Encerts, falls i falses alarmes",
      body: [
        "El mètode actual s’ha tornat a passar sobre riuades documentades — Mallorca i València l’octubre de 2024, Catalunya i Màlaga el novembre de 2024, Múrcia el setembre de 2023 — i sobre dies tranquils que havien de quedar-se tranquils.",
        "Hi ha encerts, falls i falses alarmes: color que queda després d’un episodi fort, i dies en què els models no van veure la pluja que va caure. Aquests casos queden registrats. No és una afirmació que el mapa sigui complet. És constància que el mètode es prova, i que les fallades es coneixen.",
      ],
    },
  },
};

const es: MethodCopy = {
  nav: "Método",
  title: "Qué significa este nivel",
  back: "Volver al mapa",
  lead: "El mapa pinta una situación, hora a hora. Aquí se explica en qué se basa, y dónde el método falla de forma conocida.",
  sections: {
    what: {
      heading: "Qué es el nivel",
      body: [
        "Cada hora tiene un nivel de 0 a 4, hecho con modelos públicos (ICON y ECMWF). Se buscan ingredientes conocidos de DANA — aire frío arriba, mar cálido, aire húmedo abajo — y se contrastan con la lluvia de esos modelos. Un color alto pide lluvia en el modelo, no solo un núcleo frío arriba.",
        "Un modelo más fino (AROME) se compara en episodios pasados allí donde cubre la zona; no entra en el nivel en vivo. La tira y el mapa muestran el día en conjunto: una hora inestable no pinta el día. El número es una situación, no un porcentaje ni una instrucción.",
      ],
    },
    peaks: {
      heading: "Los modelos se quedan cortos en los picos locales",
      body: [
        "En la lluvia más fuerte y más concentrada — como la de Valencia en octubre de 2024 — todos los modelos probados, también el más fino, se quedaron muy por debajo de lo que cayó de verdad. Los modelos más finos se acercan; no cierran el hueco. Un nivel bajo un día así no es garantía de que ocurra poco.",
      ],
    },
    rivers: {
      heading: "El río puede subir lejos de la lluvia",
      body: [
        "La lluvia local puede parecer modesta y el río subir fuerte igual, porque el agua llega de más arriba de la cuenca, con un retraso de horas o de un día. Esa subida tardía del río aún no entra en el nivel.",
      ],
    },
    coverage: {
      heading: "Hay zonas más contrastadas que otras",
      body: [
        "Valencia, Murcia y Cataluña se han contrastado con más riadas documentadas que Málaga, Almería, Gibraltar o Baleares. Un nivel en una zona menos contrastada descansa sobre menos casos.",
      ],
    },
    not: {
      heading: "Qué no hace esta herramienta",
      body: [
        "No da un porcentaje de probabilidad: harían falta datos que no están. No dice a nadie que se vaya, que se quede o que suba. No sustituye los avisos de AEMET. Es una señal extra y abierta, no una autoridad.",
      ],
    },
    tested: {
      heading: "Aciertos, fallos y falsas alarmas",
      body: [
        "El método actual se ha vuelto a pasar sobre riadas documentadas — Mallorca y Valencia en octubre de 2024, Cataluña y Málaga en noviembre de 2024, Murcia en septiembre de 2023 — y sobre días tranquilos que debían quedarse tranquilos.",
        "Hay aciertos, fallos y falsas alarmas: color que queda después de un episodio fuerte, y días en que los modelos no vieron la lluvia que cayó. Esos casos quedan registrados. No es una afirmación de que el mapa esté completo. Es constancia de que el método se prueba, y de que los fallos se conocen.",
      ],
    },
  },
};

const en: MethodCopy = {
  nav: "Method",
  title: "What this level means",
  back: "Back to the map",
  lead: "The map paints a situation, hour by hour. This page says what that situation rests on, and where the method is known to fall short.",
  sections: {
    what: {
      heading: "What the level is",
      body: [
        "Each hour is a level from 0 to 4, built from public weather models (ICON and ECMWF). Known DANA ingredients — cold air high up, a warm sea, moist air near the ground — are set against rain in those models. A high colour needs rain in the model, not only a cold pool overhead.",
        "A finer-scale model (AROME) is compared on past events where it covers the area; it is not in the live level. Strip and map show the day as a whole: one unsettled hour does not colour the day. The number is a situation, not a chance figure and not advice.",
      ],
    },
    peaks: {
      heading: "Models miss the worst local peaks",
      body: [
        "In the heaviest, most concentrated downpours — such as Valencia in October 2024 — every model we tested, including the finest, fell well short of the rain that actually fell. Finer models come closer; they do not close the gap. A low level on a day like that is not a guarantee that little will happen.",
      ],
    },
    rivers: {
      heading: "Rivers can rise far from the rain",
      body: [
        "Rain over a town can look modest while a river still rises hard, because water is arriving from higher in the catchment, hours to a day later. That delayed river rise is not in the level.",
      ],
    },
    coverage: {
      heading: "Some regions are tested more than others",
      body: [
        "Valencia, Murcia and Catalonia have been checked against more documented floods than Málaga, Almería, Gibraltar or the Balearics. A level in a less-tested region rests on fewer cases.",
      ],
    },
    not: {
      heading: "What this tool does not do",
      body: [
        "It does not produce a chance figure — that would need data we do not have. It does not tell anyone to leave, stay, or go upstairs. It does not replace AEMET warnings. It is an extra, open signal, not an authority.",
      ],
    },
    tested: {
      heading: "Hits, misses, and false alarms",
      body: [
        "The current method has been replayed on documented floods — Mallorca and Valencia in October 2024, Catalonia and Málaga in November 2024, Murcia in September 2023 — and on quiet days that should have stayed quiet.",
        "There are hits, misses, and false alarms: leftover colour after a big event, and days when the models did not see the rain that fell. Those cases are kept on record. This is not a claim that the map is complete. It is a record that the method is tested, and that its failures are known.",
      ],
    },
  },
};

const de: MethodCopy = {
  nav: "Methode",
  title: "Was diese Stufe bedeutet",
  back: "Zurück zur Karte",
  lead: "Die Karte zeichnet eine Lage, Stunde für Stunde. Hier steht, worauf diese Lage beruht, und wo die Methode bekanntermaßen zu kurz greift.",
  sections: {
    what: {
      heading: "Was die Stufe ist",
      body: [
        "Jede Stunde bekommt eine Stufe von 0 bis 4, aus öffentlichen Wettermodellen (ICON und ECMWF). Bekannte DANA-Zutaten — Kaltluft oben, warmes Meer, feuchte Luft unten — werden gegen den Regen in denselben Modellen gesetzt. Eine hohe Farbe braucht Regen im Modell, nicht nur einen Kaltkern oben.",
        "Ein feineres Modell (AROME) wird bei vergangenen Ereignissen verglichen, wo es das Gebiet abdeckt; es geht nicht in die live Stufe ein. Leiste und Karte zeigen den Tag insgesamt: eine unruhige Stunde färbt den Tag nicht. Die Zahl ist eine Lage, keine Prozentzahl und keine Anweisung.",
      ],
    },
    peaks: {
      heading: "Modelle unterschätzen die schärfsten lokalen Spitzen",
      body: [
        "Beim schwersten, am stärksten gebündelten Regen — wie in Valencia im Oktober 2024 — lagen alle geprüften Modelle, auch das feinste, deutlich unter dem, was wirklich fiel. Feinere Modelle kommen näher; sie schließen die Lücke nicht. Eine niedrige Stufe an einem solchen Tag ist keine Garantie, dass wenig passiert.",
      ],
    },
    rivers: {
      heading: "Flüsse können weit vom Regen steigen",
      body: [
        "Der Regen vor Ort kann mäßig wirken, während ein Fluss trotzdem stark steigt, weil Wasser von weiter oben im Einzugsgebiet kommt, mit Stunden bis zu einem Tag Verzug. Dieser verspätete Flussanstieg steckt noch nicht in der Stufe.",
      ],
    },
    coverage: {
      heading: "Manche Regionen sind besser geprüft als andere",
      body: [
        "Valencia, Murcia und Katalonien sind an mehr dokumentierten Hochwassern geprüft als Málaga, Almería, Gibraltar oder die Balearen. Eine Stufe in einer weniger geprüften Region steht auf weniger Fällen.",
      ],
    },
    not: {
      heading: "Was dieses Werkzeug nicht tut",
      body: [
        "Es liefert keine Wahrscheinlichkeitszahl — dafür fehlten Daten, die es nicht gibt. Es sagt niemandem, er solle gehen, bleiben oder nach oben. Es ersetzt keine AEMET-Warnungen. Es ist ein zusätzliches, offenes Signal, keine Behörde.",
      ],
    },
    tested: {
      heading: "Treffer, Fehlschläge und Fehlalarme",
      body: [
        "Die jetzige Methode wurde an dokumentierten Hochwassern erneut durchgerechnet — Mallorca und Valencia im Oktober 2024, Katalonien und Málaga im November 2024, Murcia im September 2023 — und an ruhigen Tagen, die ruhig bleiben sollten.",
        "Es gibt Treffer, Fehlschläge und Fehlalarme: Farbe, die nach einem starken Ereignis hängen bleibt, und Tage, an denen die Modelle den Regen nicht sahen, der fiel. Diese Fälle bleiben vermerkt. Das ist keine Behauptung, die Karte sei vollständig. Es ist der Nachweis, dass die Methode geprüft wird, und dass die Fehler bekannt sind.",
      ],
    },
  },
};

const nl: MethodCopy = {
  nav: "Methode",
  title: "Wat dit niveau betekent",
  back: "Terug naar de kaart",
  lead: "De kaart tekent een situatie, uur na uur. Hier staat waar die situatie op rust, en waar de methode bekend tekortschiet.",
  sections: {
    what: {
      heading: "Wat het niveau is",
      body: [
        "Elk uur krijgt een niveau van 0 tot 4, uit publieke weermodellen (ICON en ECMWF). Bekende DANA-ingrediënten — koude lucht hoog, een warme zee, vochtige lucht bij de grond — worden afgezet tegen regen in diezelfde modellen. Een hoge kleur vraagt regen in het model, niet alleen een koude kern daarboven.",
        "Een fijner model (AROME) wordt vergeleken op eerdere gebeurtenissen waar het het gebied dekt; het zit niet in het live niveau. Strook en kaart tonen de dag als geheel: één onbestendig uur kleurt de dag niet. Het cijfer is een situatie, geen kanspercentage en geen instructie.",
      ],
    },
    peaks: {
      heading: "Modellen missen de zwaarste lokale pieken",
      body: [
        "Bij de zwaarste, meest geconcentreerde regen — zoals in Valencia in oktober 2024 — bleven alle geteste modellen, ook de fijnste, ruim onder wat er echt viel. Fijnere modellen komen dichterbij; ze dichten het gat niet. Een laag niveau op zo’n dag is geen garantie dat er weinig gebeurt.",
      ],
    },
    rivers: {
      heading: "Rivieren kunnen ver van de regen stijgen",
      body: [
        "Lokale regen kan mild lijken terwijl een rivier toch hard stijgt, omdat het water van hogerop in het stroomgebied komt, met een vertraging van uren tot een dag. Die vertraagde rivierstijging zit nog niet in het niveau.",
      ],
    },
    coverage: {
      heading: "Sommige regio’s zijn beter getoetst dan andere",
      body: [
        "Valencia, Murcia en Catalonië zijn tegen meer gedocumenteerde overstromingen gelegd dan Málaga, Almería, Gibraltar of de Balearen. Een niveau in een minder getoetste regio rust op minder gevallen.",
      ],
    },
    not: {
      heading: "Wat deze tool niet doet",
      body: [
        "Ze geeft geen kanspercentage — daarvoor ontbreekt data die er niet is. Ze zegt niemand dat ze weg moeten, blijven of naar boven gaan. Ze vervangt geen AEMET-waarschuwingen. Het is een extra, open signaal, geen autoriteit.",
      ],
    },
    tested: {
      heading: "Treffers, misses en valse alarmen",
      body: [
        "De huidige methode is opnieuw afgedraaid op gedocumenteerde overstromingen — Mallorca en Valencia in oktober 2024, Catalonië en Málaga in november 2024, Murcia in september 2023 — en op rustige dagen die rustig hadden moeten blijven.",
        "Er zijn treffers, misses en valse alarmen: kleur die blijft hangen na een zware gebeurtenis, en dagen waarop de modellen de regen niet zagen die viel. Die gevallen staan op record. Dit is geen claim dat de kaart compleet is. Het is vastgelegd dat de methode getest wordt, en dat de fouten bekend zijn.",
      ],
    },
  },
};

const cs: MethodCopy = {
  nav: "Metoda",
  title: "Co tato úroveň znamená",
  back: "Zpět na mapu",
  lead: "Mapa kreslí situaci, hodinu po hodině. Tady je, na čem ta situace stojí, a kde metoda známým způsobem selhává.",
  sections: {
    what: {
      heading: "Co úroveň je",
      body: [
        "Každá hodina má úroveň 0 až 4, z veřejných modelů počasí (ICON a ECMWF). Hledají se známé složky DANA — studený vzduch nahoře, teplé moře, vlhký vzduch dole — a staví se proti dešti v týchž modelech. Vysoká barva chce déšť v modelu, ne jen studené jádro nahoře.",
        "Jemnější model (AROME) se srovnává u minulých událostí tam, kde území pokrývá; do živé úrovně nevstupuje. Pruh a mapa ukazují den jako celek: jedna neklidná hodina den nepřebarví. Číslo je situace, ne procento a ne pokyn.",
      ],
    },
    peaks: {
      heading: "Modely podstřelují nejhorší místní špičky",
      body: [
        "U nejtěžšího, nejvíce soustředěného deště — jako ve Valencii v říjnu 2024 — všechny zkoušené modely, i ten nejjemnější, zůstaly daleko pod tím, co opravdu spadlo. Jemnější modely se přibližují; mezeru nezavřou. Nízká úroveň v takový den není záruka, že se stane málo.",
      ],
    },
    rivers: {
      heading: "Řeka může stoupnout daleko od deště",
      body: [
        "Místní déšť může vypadat mírně, zatímco řeka přesto silně stoupá, protože voda přichází z výš v povodí, se zpožděním hodin až dne. Ten zpožděný vzestup řeky v úrovni ještě není.",
      ],
    },
    coverage: {
      heading: "Některé oblasti jsou prověřené víc než jiné",
      body: [
        "Valencie, Murcie a Katalánsko se srovnávaly s více zdokumentovanými povodněmi než Málaga, Almería, Gibraltar nebo Baleáry. Úroveň v méně prověřené oblasti stojí na méně případech.",
      ],
    },
    not: {
      heading: "Co tento nástroj nedělá",
      body: [
        "Nedává číslo pravděpodobnosti — k tomu by byla data, která nejsou. Nikomu neříká, ať odejde, zůstane, nebo jde nahoru. Nenahrazuje výstrahy AEMET. Je to další, otevřený signál, ne autorita.",
      ],
    },
    tested: {
      heading: "Zásahy, minutí a falešné poplachy",
      body: [
        "Současná metoda se znovu pustila na zdokumentovaných povodních — Mallorca a Valencie v říjnu 2024, Katalánsko a Málaga v listopadu 2024, Murcie v září 2023 — a na klidných dnech, které měly zůstat klidné.",
        "Jsou zásahy, minutí a falešné poplachy: barva, která zbude po silné události, a dny, kdy modely neviděly déšť, který spadl. Tyto případy zůstávají zaznamenané. Není to tvrzení, že mapa je úplná. Je to záznam, že se metoda zkouší, a že chyby jsou známé.",
      ],
    },
  },
};

export const methodCopy: Record<Lang, MethodCopy> = { ca, es, en, de, nl, cs };

export function isMethodHash(hash = typeof window === "undefined" ? "" : window.location.hash): boolean {
  return hash === METHOD_HASH;
}
