// components/logo-casaflow.tsx
import Image from "next/image";
import Link from "next/link";

/** Logo CasaFlow (icona + wordmark, senza il payoff "Valore alle tue
 * scelte" — troppo piccolo per restare leggibile all'altezza di un
 * header). Sostituisce il testo "CasaFlow" prima usato in ogni pagina.
 *
 * `link=false` va usato solo nella home: lì il logo non deve
 * autolinkarsi a se stesso, come da convenzione già in uso per il
 * testo che sostituisce. */
export default function LogoCasaFlow({ link = true }: { link?: boolean }) {
  const immagine = (
    <Image
      src="/logo-casaflow.png"
      alt="CasaFlow"
      width={1043}
      height={671}
      priority
      className="h-8 w-auto sm:h-10"
    />
  );
  return link ? <Link href="/">{immagine}</Link> : immagine;
}
