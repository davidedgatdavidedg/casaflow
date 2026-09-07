// src/lib/calcolo/prova.ts
import { calcolaImu } from "./imu";

var immobile = "";
var risultato = 0;
var totale;

/*==========  LIBERAZIONE   ==========*/
totale = 0;

immobile = "[Peschiera Borromeo] Via della Liberazione 33, piano S1 — C/6, rendita 47,41€ (F.68 P.133 Sub.43):";
risultato = calcolaImu(47.41, "C/6", "affittata", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via della Liberazione 33, piano 5 — A/3, rendita 568,10€ (F.68 P.133 Sub.701):";
risultato = calcolaImu(568.10, "A/3", "affittata", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via della Liberazione 33, piano S1 — C/2, rendita 13,74€ (F.68 P.133 Sub.702):";
risultato = calcolaImu(13.74, "C/2", "affittata", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via della Liberazione 33 - TOTALE:";
console.log(immobile, totale);

/*==========  KING   ==========*/
totale = 0;

immobile = "[Peschiera Borromeo] Via Martin Luther King 3/D, piano 4-5 — A/2, rendita 592,63€ (F.70 P.93 Sub.72)";
risultato = calcolaImu(592.63, "A/2", "abitazionePrincipale", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via Martin Luther King 3/D, piano S1 — C/6, rendita 46,48€ (F.70 P.93 Sub.79):";
risultato = calcolaImu(46.48, "C/6", "abitazionePrincipale", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via Martin Luther King 3/D, piano S1 — C/6, rendita 34,24€ (F.70 P.93 Sub.142)";
risultato = calcolaImu(34.24, "C/6", "affittata", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

immobile = "[Peschiera Borromeo] Via Martin Luther King 3/D - TOTALE:";
console.log(immobile, totale);

/*==========  DIAZ   ==========*/
totale = 0;

immobile = "[Peschiera Borromeo] Via Armando Diaz, piano S1 — C/6, rendita 57,84€ (F.69 P.96 Sub.19)";
risultato = calcolaImu(57.84, "C/6", "affittata", "Peschiera Borromeo");
totale += risultato;
console.log(immobile, risultato);

