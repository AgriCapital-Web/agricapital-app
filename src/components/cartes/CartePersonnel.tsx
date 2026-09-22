import { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo from "@/assets/logo-agricapital-v2.png";
import symbole from "@/assets/symbole-agricapital.png";
import signature from "@/assets/signature-direction.png";
import cachet from "@/assets/cachet-agricapital.png";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { CARTE_BUCKET } from "@/lib/photoCarte";
import { roleLabel } from "@/lib/roles";

/**
 * Carte professionnelle AgriCapital — reproduction fidèle des maquettes
 * officielles recto / verso (champs, textes et mise en page identiques).
 * Format d'impression : 54 × 86 mm.
 */

const VERT = "#0B4A2E";
const VERT_CLAIR = "#137A45";
const ORANGE = "#E97A11";
const GRIS = "#4A4A4A";

export interface CarteData {
  id?: string;
  matricule: string;
  code_verification: string;
  nom_complet: string;
  poste?: string | null;
  departement?: string | null;
  role_code?: string | null;
  type_contrat?: string | null;
  statut_agent?: string | null;
  mission?: string | null;
  zone_intervention?: string | null;
  photo_url?: string | null;
  photo_bucket?: string | null;
  date_delivrance?: string | null;
  date_expiration?: string | null;
  statut?: string | null;
  telephone?: string | null;
  email?: string | null;
}

export const CONTRATS = [
  { v: "cdi", l: "CDI" },
  { v: "cdd", l: "CDD" },
  { v: "prestataire", l: "Prestataire" },
  { v: "stage", l: "Stage" },
];

export const STATUTS_AGENT = [
  { v: "employe", l: "EMPLOYÉ" },
  { v: "cadre", l: "CADRE" },
  { v: "prestataire", l: "PRESTATAIRE" },
  { v: "stagiaire", l: "STAGIAIRE" },
  { v: "partenaire", l: "PARTENAIRE" },
];

export const contratLabel = (v?: string | null) => CONTRATS.find((c) => c.v === v)?.l || "CDI";
export const statutAgentLabel = (v?: string | null) =>
  STATUTS_AGENT.find((s) => s.v === v)?.l || "EMPLOYÉ";

/** Mission courte générée automatiquement selon le rôle / poste de l'agent. */
const MISSIONS_PAR_ROLE: Record<string, string> = {
  super_admin: "Direction générale",
  admin: "Administration plateforme",
  responsable_operations: "Pilotage des opérations",
  directeur_tc: "Direction technico-commerciale",
  responsable_commercial: "Pilotage de portefeuille",
  responsable_zone: "Supervision de zone",
  comptable: "Gestion financière",
  chef_equipe_commercial: "Encadrement équipe commerciale",
  chef_equipe_technique: "Encadrement équipe technique",
  chef_equipe_service_client: "Encadrement service client",
  commercial: "Acquisition clients",
  technicien: "Suivi technique des plantations",
  service_client: "Assistance souscripteurs",
  assistant_administratif: "Appui administratif",
};

export const missionAuto = (carte: CarteData) =>
  carte.mission ||
  MISSIONS_PAR_ROLE[carte.role_code || ""] ||
  carte.poste ||
  "Missions AgriCapital";

const fdate = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: fr }) : "—");

/** Validité : indéterminée en CDI, sinon jusqu'à la date de fin de contrat. */
export const validiteTexte = (carte: CarteData) => {
  if (carte.type_contrat === "cdi") return "Indéterminée";
  const debut = carte.date_delivrance ? `Du ${fdate(carte.date_delivrance)} ` : "";
  return carte.date_expiration ? `${debut}au ${fdate(carte.date_expiration)}` : "Indéterminée";
};

export const verificationUrl = (code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://app.agricapital.ci"}/verifier-carte/${code}`;


const initiales = (nom: string) =>
  nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

/** Courbes officielles, maintenues hors de toutes les zones de contenu. */
const DecorHaut = () => (
  <>
    <svg className="pointer-events-none absolute left-0 top-0 h-[18mm] w-[11mm]" viewBox="0 0 110 180" aria-hidden>
      <path d="M0 0H110C58 24 24 76 0 154Z" fill={VERT} />
    </svg>
    <svg className="pointer-events-none absolute right-0 top-[8mm] h-[12mm] w-[13mm]" viewBox="0 0 130 120" aria-hidden>
      <path d="M130 0V72C96 94 58 108 0 116C57 90 101 52 130 0Z" fill={ORANGE} />
    </svg>
  </>
);

const DecorBas = () => (
  <svg className="pointer-events-none absolute bottom-0 left-0 h-[9mm] w-full" viewBox="0 0 300 54" preserveAspectRatio="none" aria-hidden>
    <path d="M0 17C93 48 215 49 300 9V54H0Z" fill="#E7E7E7" />
    <path d="M0 25C92 52 214 52 300 14V54H0Z" fill={ORANGE} />
    <path d="M0 34C99 56 220 54 300 23V54H0Z" fill={VERT} />
  </svg>
);

type IconeCarte = "mission" | "pays" | "validite" | "identifiant";

/** Pictogrammes officiels de la maquette (cible, localisation, calendrier, badge). */
const PICTOS: Record<IconeCarte, string> = {
  mission:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2A6.8 6.8 0 1 1 5.2 12 6.8 6.8 0 0 1 12 5.2Zm0 3.4A3.4 3.4 0 1 0 12 15.4 3.4 3.4 0 0 0 12 8.6Zm0 2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z",
  pays: "M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2Z",
  validite:
    "M7 2h2v2h6V2h2v2h2a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2V2Zm13 8H4v10h16V10ZM6 12h4v3H6v-3Z",
  identifiant:
    "M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 3v10h6V7H5Zm3 1.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2ZM5.9 15.6c.3-1.2 1.1-1.9 2.1-1.9s1.8.7 2.1 1.9H5.9ZM13 8h6v1.6h-6V8Zm0 3.2h6v1.6h-6v-1.6Zm0 3.2h4v1.6h-4v-1.6Z",
};

const Ligne = ({
  label,
  valeur,
  icone,
}: { label: string; valeur: string; icone: IconeCarte }) => (
  <div className="grid h-[5.1mm] grid-cols-[5mm_0.5mm_15mm_1mm_1fr] items-center gap-[1mm] border-b" style={{ borderColor: "#C9C9C9" }}>
    <span
      className="flex h-[4.4mm] w-[4.4mm] items-center justify-center rounded-full"
      style={{ backgroundColor: VERT }}
    >
      <svg viewBox="0 0 24 24" className="h-[2.7mm] w-[2.7mm]" fill="#fff" aria-hidden>
        <path d={PICTOS[icone]} />
      </svg>
    </span>
    <span className="h-[3.6mm] w-[0.5mm]" style={{ backgroundColor: ORANGE }} />
    <span
      className="whitespace-nowrap text-[4.5pt] font-bold uppercase leading-none"
      style={{ color: VERT }}
    >
      {label}
    </span>
    <span className="text-[4.6pt] leading-none" style={{ color: GRIS }}>:</span>
    <span
      className="min-w-0 truncate text-[4.7pt] leading-none"
      style={{
        color: GRIS,
      }}
    >
      {valeur}
    </span>
  </div>
);



const CardShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative h-[86mm] w-[54mm] shrink-0 overflow-hidden rounded-[2.2mm] bg-white font-sans" style={{ border: `0.35mm solid ${VERT}`, color: GRIS }}>
    {children}
  </div>
);

/** Recto — grille fixe conforme à la maquette officielle. */
export const CarteRecto = forwardRef<HTMLDivElement, { carte: CarteData }>(({ carte }, ref) => {
  const photo = useSignedUrl(carte.photo_bucket || CARTE_BUCKET, carte.photo_url);
  return (
    <div ref={ref}><CardShell>
      <DecorHaut />
      <div className="relative z-10 px-[3.2mm] pt-[3mm]">
        <img src={logo} alt="AgriCapital — Investir la terre. Cultiver l'avenir." className="mx-auto h-[10mm] w-[32mm] object-contain" />
        <div className="mt-[2.2mm] grid grid-cols-[15.5mm_1fr] gap-[2.4mm]">
          <div
            className="h-[23mm] w-[15.5mm] overflow-hidden rounded-[1.3mm]"
            style={{ border: `0.35mm solid ${VERT}`, backgroundColor: "#E7E7E7" }}
          >
            {photo ? (
              <img src={photo} alt={carte.nom_complet} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12pt] font-bold" style={{ color: "#929292" }}>
                {initiales(carte.nom_complet)}
              </div>
            )}
          </div>
          <div className="min-w-0 pt-[1.2mm]">
            <p className="line-clamp-2 break-words text-[8pt] font-extrabold uppercase leading-[1.05]" style={{ color: VERT }}>
              {carte.nom_complet}
            </p>
            <div className="my-[1.2mm] flex items-center gap-[1mm]">
              <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
              <img src={symbole} alt="" className="h-[2.6mm] object-contain" />
              <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
            </div>
            <p className="text-[6.4pt] font-bold uppercase leading-none">Fonction</p>
            <p className="mt-[0.6mm] line-clamp-2 h-[5mm] break-words text-[5.4pt] leading-[2.35mm]">
              {carte.poste || roleLabel(carte.role_code)}
            </p>
            <div className="mt-[1mm] flex items-center gap-[1.2mm]">
              <span
                className="rounded-[1mm] px-[1.5mm] py-[0.7mm] text-[5.1pt] font-bold uppercase"
                style={{ backgroundColor: VERT, color: "#FFFFFF" }}
              >
                Statut
              </span>
              <span className="h-[3mm] w-[0.3mm]" style={{ backgroundColor: "#C9C9C9" }} />
              <span className="truncate text-[5.5pt] font-bold uppercase" style={{ color: VERT_CLAIR }}>
                {statutAgentLabel(carte.statut_agent)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-[2.6mm] space-y-[0.8mm]">
          <Ligne label="Mission" valeur={missionAuto(carte)} icone="mission" />
          <Ligne label="Pays" valeur="Côte d’Ivoire" icone="pays" />
          <Ligne label="Validité" valeur={validiteTexte(carte)} icone="validite" />
          <Ligne label="Identifiant" valeur={carte.matricule} icone="identifiant" />
        </div>
        <div className="mt-[2mm] grid grid-cols-[15mm_1fr] items-end gap-[3mm]">
          <div className="rounded-[1mm] bg-white p-[0.7mm]" style={{ border: "0.25mm solid #CFCFCF" }}>
            <QRCodeCanvas
              value={verificationUrl(carte.code_verification)}
              size={1024}
              includeMargin={false}
              level="H"
              className="block h-auto w-full"
              style={{ width: "100%", height: "auto", imageRendering: "pixelated" }}
            />
          </div>
          <div className="text-center">
            <div className="relative mx-auto h-[10.5mm] w-full">
              <img src={signature} alt="Signature de la direction" className="absolute inset-x-0 bottom-[1mm] z-10 mx-auto h-[7mm] w-[24mm] object-contain" />
              <img src={cachet} alt="Cachet AgriCapital" className="absolute bottom-0 right-[2mm] z-20 h-[10mm] w-[10mm] object-contain" />
            </div>
            <span className="block h-[0.25mm] w-full" style={{ backgroundColor: "#8E8E8E" }} />
            <p className="mt-[0.7mm] text-[4.8pt] font-bold uppercase" style={{ color: VERT }}>Signature direction</p>
          </div>
        </div>
      </div>
      <DecorBas />
    </CardShell></div>
  );
});
CarteRecto.displayName = "CarteRecto";

/** Verso — grille fixe conforme à la maquette officielle. */
export const CarteVerso = forwardRef<HTMLDivElement, { carte: CarteData }>(({ carte }, ref) => (
  <div ref={ref}><CardShell>
    <DecorBas />
    <div className="relative z-10 px-[4mm] pt-[3mm]">
      <img src={logo} alt="AgriCapital — Investir la terre. Cultiver l'avenir." className="mx-auto h-[10mm] w-[32mm] object-contain" />
      <span className="mx-auto mt-[0.6mm] block h-[0.25mm] w-[7mm]" style={{ backgroundColor: VERT }} />
      <p className="mt-[1.7mm] text-center text-[4.65pt] leading-[1.42]" style={{ color: "#333333" }}>
        Cette carte est une pièce d'identification professionnelle délivrée par AgriCapital SARL.
        Elle atteste de l'appartenance ou de la collaboration de son titulaire avec l'entreprise
        dans le cadre de ses activités professionnelles.
      </p>
      <div className="mt-[2mm] rounded-[1.5mm] px-[2mm] py-[1.6mm]" style={{ border: `0.3mm solid ${VERT}` }}>
        <div className="grid grid-cols-[6mm_1fr] items-start gap-[1.8mm]">
          <svg viewBox="0 0 24 24" className="h-[6mm] w-[6mm]" fill={VERT} aria-hidden>
            <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Zm0 7a2 2 0 0 1 2 2v1h-4v-1a2 2 0 0 1 2-2Zm-3 4h6v4H9v-4Z" />
          </svg>
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[4.4pt] font-bold uppercase leading-none" style={{ color: VERT }}>
              Carte personnelle – non transférable
            </p>
            <span className="my-[1mm] block h-[0.3mm] w-full" style={{ backgroundColor: ORANGE }} />
            <p className="text-[4.35pt] leading-[1.35]" style={{ color: "#333333" }}>
              Toute perte, détérioration ou utilisation frauduleuse doit être signalée à AgriCapital SARL.
              Cette carte doit être restituée à l'entreprise à la fin de la collaboration ou sur demande.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[2mm] grid grid-cols-[14mm_1fr] items-center gap-[2.2mm]">
        <div className="rounded-[1mm] bg-white p-[0.7mm]" style={{ border: "0.25mm solid #CFCFCF" }}>
          <QRCodeCanvas
            value={verificationUrl(carte.code_verification)}
            size={1024}
            includeMargin={false}
            level="H"
            className="block h-auto w-full"
            style={{ width: "100%", height: "auto", imageRendering: "pixelated" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-[1mm] text-[4.8pt] font-bold uppercase leading-[1.15]" style={{ color: VERT }}>
            <svg viewBox="0 0 24 24" className="h-[3.4mm] w-[3.4mm] shrink-0" fill={VERT} aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14.4-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9.4l-7 7Z" />
            </svg>
            Vérification du badge
          </p>
          <p className="mt-[0.8mm] text-[4.15pt] leading-[1.35]" style={{ color: "#333333" }}>
            Scannez ce QR code pour vérifier l'authenticité et la validité de ce badge sur app.agricapital.ci
          </p>
        </div>
      </div>

      <div className="my-[1.5mm] flex items-center gap-[1mm]">
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
        <img src={symbole} alt="" className="h-[3mm] object-contain" />
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
      </div>

      <div className="grid grid-cols-[20mm_1fr] items-start gap-[2mm]">
        <div className="min-w-0 flex-1">
          <p className="text-[5.1pt] font-extrabold uppercase" style={{ color: VERT }}>AgriCapital SARL</p>
          <p className="mt-[0.7mm] text-[3.9pt] leading-[1.45]" style={{ color: "#333333" }}>
            Société à Responsabilité Limitée<br />
            RCCM : CI-DAL-01-2025-B12-00035<br />
            Daloa-Gonaté, Côte d'Ivoire
          </p>
        </div>
        <div className="min-w-0 space-y-[0.65mm]">
          {[
            { d: "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2 4.6 1v3.4A2 2 0 0 1 18 21.6 18 18 0 0 1 2.4 6 2 2 0 0 1 4.4 4h3.4l1 4.6-2.2 2.2Z", t: carte.telephone || "+225 07 50 56 60 87" },
            { d: "M2 5h20v14H2V5Zm10 8L3.5 6.6 12 12l8.5-5.4L12 13Z", t: "contact@agricapital.ci" },
            { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.6 2 2.4 4 2.4 6s-.8 4-2.4 6c-1.6-2-2.4-4-2.4-6s.8-4 2.4-6ZM4.3 9h3.3a16 16 0 0 0 0 6H4.3a8 8 0 0 1 0-6Zm12.1 0h3.3a8 8 0 0 1 0 6h-3.3a16 16 0 0 0 0-6Z", t: "www.agricapital.ci" },
            { d: "M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z", t: "Cocody, Abidjan – Côte d'Ivoire" },
          ].map((c) => (
            <p key={c.t} className="flex items-center gap-[0.8mm] text-[3.65pt] leading-tight" style={{ color: "#333333" }}>
              <span className="flex h-[3mm] w-[3mm] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: VERT }}>
                <svg viewBox="0 0 24 24" className="h-[1.9mm] w-[1.9mm]" fill="#fff" aria-hidden><path d={c.d} /></svg>
              </span>
              <span className="truncate">{c.t}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  </CardShell></div>
));
CarteVerso.displayName = "CarteVerso";
