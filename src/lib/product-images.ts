import hero from "@/assets/hero-tulips.jpg";
import pervyySneg from "@/assets/pervyy-sneg.jpg";
import rumyanoeUtro from "@/assets/rumyanoe-utro.jpg";
import solnechnyyDozhd from "@/assets/solnechnyy-dozhd.jpg";
import malinovyyVecher from "@/assets/malinovyy-vecher.jpg";
import sirenISneg from "@/assets/siren-i-sneg.jpg";
import devyatTulpanov from "@/assets/devyat-tulpanov.jpg";
import tulpanBelyy from "@/assets/tulpan-belyy.jpg";
import tulpanRozovyy from "@/assets/tulpan-rozovyy.jpg";
import vazaTuman from "@/assets/vaza-tuman.jpg";
import otkrytkaVesna from "@/assets/otkrytka-vesna.jpg";

export const heroImage = hero;

const bySlug: Record<string, string> = {
  "pervyy-sneg": pervyySneg,
  "rumyanoe-utro": rumyanoeUtro,
  "solnechnyy-dozhd": solnechnyyDozhd,
  "malinovyy-vecher": malinovyyVecher,
  "siren-i-sneg": sirenISneg,
  "devyat-tulpanov": devyatTulpanov,
  "tulpan-poshtuchno-belyy": tulpanBelyy,
  "tulpan-poshtuchno-rozovyy": tulpanRozovyy,
  "vaza-tuman": vazaTuman,
  "otkrytka-vesna": otkrytkaVesna,
};

export function productImage(product: { slug: string; image_url?: string | null }): string {
  return product.image_url || bySlug[product.slug] || hero;
}
