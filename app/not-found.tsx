import Link from "next/link";
export default function NotFound() { return <div className="page-wrap not-found"><p className="eyebrow">404 · Arkivlucka</p><h1>Det här receptet finns inte.</h1><p>Vi hittar inget recept på den här hyllan.</p><Link className="button" href="/vault">Till Vault</Link></div>; }
