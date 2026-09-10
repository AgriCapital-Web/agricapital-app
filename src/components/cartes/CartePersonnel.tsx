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

/** Décors d'angle (courbes vertes et orange) identiques aux maquettes. */
const DecorHaut = () => (
  <>
    <svg className="pointer-events-none absolute left-0 top-0 h-[14mm] w-[14mm]" viewBox="0 0 100 100" aria-hidden>
      <path d="M0 0 H72 C34 6 6 34 0 72 Z" fill={VERT} />
    </svg>
    <svg className="pointer-events-none absolute right-0 top-0 h-[9mm] w-[17mm]" viewBox="0 0 170 90" aria-hidden>
      <path d="M170 0 V90 C132 62 78 40 0 24 C74 12 128 5 170 0 Z" fill={ORANGE} />
    </svg>
  </>
);

const DecorBas = ({ hauteur = "10mm" }: { hauteur?: string }) => (
  <svg className="pointer-events-none absolute bottom-0 left-0 w-full" style={{ height: hauteur }} viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden>
    <path d="M0 26 C90 0 210 10 300 0 V60 H0 Z" fill={ORANGE} />
    <path d="M0 40 C90 14 210 22 300 10 V60 H0 Z" fill={VERT} />
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
  lignes = 1,
}: { label: string; valeur: string; icone: IconeCarte; lignes?: number }) => (
  <div className="flex items-center gap-[1.2mm]">
    <span
      className="flex h-[4.8mm] w-[4.8mm] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: VERT }}
    >
      <svg viewBox="0 0 24 24" className="h-[2.9mm] w-[2.9mm]" fill="#fff" aria-hidden>
        <path d={PICTOS[icone]} />
      </svg>
    </span>
    <span className="h-[3.8mm] w-[0.5mm] shrink-0" style={{ backgroundColor: ORANGE }} />
    <span
      className="w-[13mm] shrink-0 text-[4.8pt] font-bold uppercase leading-[1.15]"
      style={{ color: VERT }}
    >
      {label}
    </span>
    <span className="shrink-0 text-[5pt] leading-none" style={{ color: GRIS }}>:</span>
    <span
      className="min-w-0 flex-1 border-b pb-[0.4mm] text-[5.2pt] leading-[2.3mm]"
      style={{
        color: GRIS,
        borderColor: "#D6D6D6",
        display: "block",
        height: `${2.3 * lignes}mm`,
        overflow: "hidden",
      }}
    >
      {valeur}
    </span>
  </div>
);



/** Recto — maquette officielle CARTE_PRO_AGRICAPITAL_RECTO. */
export const CarteRecto = forwardRef<HTMLDivElement, { carte: CarteData }>(({ carte }, ref) => {
  const photo = useSignedUrl(carte.photo_bucket || CARTE_BUCKET, carte.photo_url);
  return (
    <div
      ref={ref}
      className="relative h-[86mm] w-[54mm] shrink-0 overflow-hidden rounded-[3mm] bg-white"
      style={{ border: `0.4mm solid ${VERT}` }}
    >
      <DecorHaut />

      <div className="relative flex h-full flex-col px-[3.5mm] pb-[9.5mm] pt-[2.5mm]">
        <img src={logo} alt="AgriCapital — Investir la terre. Cultiver l'avenir." className="mx-auto h-[10mm] object-contain" />

        <div className="mt-[2mm] flex items-start gap-[2.5mm]">
          <div
            className="h-[22mm] w-[16mm] shrink-0 overflow-hidden rounded-[1.5mm] bg-[#EDEDED]"
            style={{ border: `0.4mm solid ${VERT}` }}
          >

            {photo ? (
              <img src={photo} alt={carte.nom_complet} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12pt] font-bold" style={{ color: "#8A8A8A" }}>
                {initiales(carte.nom_complet)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="break-words text-[9pt] font-extrabold uppercase leading-[1.05]" style={{ color: VERT }}>
              {carte.nom_complet}
            </p>
            <div className="my-[1mm] flex items-center gap-[1mm]">
              <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
              <img src={symbole} alt="" className="h-[2.6mm] object-contain" />
              <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
            </div>
            <p className="text-[7pt] font-bold uppercase leading-none" style={{ color: GRIS }}>Fonction</p>
            <p
              className="text-[6pt] leading-[1.2]"
              style={{
                color: GRIS,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {carte.poste || roleLabel(carte.role_code)}
            </p>
            <div className="mt-[1.5mm] flex items-center gap-[1.2mm]">
              <span
                className="rounded-[1mm] px-[1.5mm] py-[0.6mm] text-[5.5pt] font-bold uppercase text-white"
                style={{ backgroundColor: VERT }}
              >
                Statut
              </span>
              <span className="h-[3mm] w-[0.3mm]" style={{ backgroundColor: "#C9C9C9" }} />
              <span className="text-[6pt] font-bold uppercase" style={{ color: VERT_CLAIR }}>
                {statutAgentLabel(carte.statut_agent)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-[3.5mm] space-y-[2.2mm]">
          <Ligne label="Mission" valeur={missionAuto(carte)} icone="mission" lignes={2} />
          <Ligne label="Pays" valeur="Côte d'Ivoire" icone="pays" />
          <Ligne label="Validité" valeur={validiteTexte(carte)} icone="validite" />
          <Ligne label="Identifiant" valeur={carte.matricule} icone="identifiant" />
        </div>

        <div className="mt-auto flex items-end justify-between gap-[2mm] pt-[2.5mm]">
          <div className="rounded-[1mm] bg-white p-[0.5mm]" style={{ border: `0.25mm solid #D6D6D6` }}>
            <QRCodeCanvas value={verificationUrl(carte.code_verification)} size={48} includeMargin={false} level="M" />
          </div>
          <div className="w-[23mm] shrink-0 text-center">
            <p className="text-[5pt] font-bold uppercase" style={{ color: VERT }}>Signature direction</p>
            <div className="relative h-[8mm]">
              <img src={signature} alt="Signature de la direction" className="absolute inset-0 mx-auto h-[8mm] object-contain" />
              <img src={cachet} alt="" className="absolute inset-0 mx-auto h-[8mm] object-contain opacity-70" />
            </div>
            <span className="block h-[0.3mm] w-full" style={{ backgroundColor: "#9A9A9A" }} />
          </div>
        </div>

      </div>

      <DecorBas hauteur="9mm" />


    </div>
  );
});
CarteRecto.displayName = "CarteRecto";

/** Verso — maquette officielle CARTE_PRO_AGRICAPITAL_VERSO. */
export const CarteVerso = forwardRef<HTMLDivElement, { carte: CarteData }>(({ carte }, ref) => (
  <div
    ref={ref}
    className="relative h-[86mm] w-[54mm] shrink-0 overflow-hidden rounded-[3mm] bg-white"
    style={{ border: `0.4mm solid ${VERT}` }}
  >
    <DecorBas />

    <div className="relative flex h-full flex-col px-[4mm] pb-[16mm] pt-[3mm]">
      <img src={logo} alt="AgriCapital — Investir la terre. Cultiver l'avenir." className="mx-auto h-[11mm] object-contain" />
      <span className="mx-auto mt-[1.2mm] h-[0.3mm] w-[12mm]" style={{ backgroundColor: VERT }} />


      <p className="mt-[2mm] text-center text-[5.4pt] leading-[1.5]" style={{ color: "#333" }}>
        Cette carte est une pièce d'identification professionnelle délivrée par AgriCapital SARL.
        Elle atteste de l'appartenance ou de la collaboration de son titulaire avec l'entreprise
        dans le cadre de ses activités professionnelles.
      </p>

      <div className="mt-[2.5mm] rounded-[2mm] p-[2mm]" style={{ border: `0.3mm solid ${VERT}` }}>
        <div className="flex items-start gap-[2mm]">
          <svg viewBox="0 0 24 24" className="h-[7mm] w-[7mm] shrink-0" fill={VERT} aria-hidden>
            <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3Zm0 7a2 2 0 0 1 2 2v1h-4v-1a2 2 0 0 1 2-2Zm-3 4h6v4H9v-4Z" />
          </svg>
          <div className="min-w-0">
            <p className="text-[5.6pt] font-bold uppercase leading-tight" style={{ color: VERT }}>
              Carte personnelle – non transférable
            </p>
            <span className="my-[1mm] block h-[0.3mm] w-full" style={{ backgroundColor: ORANGE }} />
            <p className="text-[5pt] leading-[1.45]" style={{ color: "#333" }}>
              Toute perte, détérioration ou utilisation frauduleuse doit être signalée à AgriCapital SARL.
              Cette carte doit être restituée à l'entreprise à la fin de la collaboration ou sur demande.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[2.5mm] flex items-center gap-[2.5mm]">
        <div className="rounded-[1mm] bg-white p-[0.8mm]" style={{ border: `0.3mm solid #D6D6D6` }}>
          <QRCodeCanvas value={verificationUrl(carte.code_verification)} size={58} includeMargin={false} level="M" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-[1.2mm] text-[5.6pt] font-bold uppercase" style={{ color: VERT }}>
            <svg viewBox="0 0 24 24" className="h-[3.6mm] w-[3.6mm]" fill={VERT} aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 14.4-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9.4l-7 7Z" />
            </svg>
            Vérification du badge
          </p>
          <p className="text-[5pt] leading-[1.4]" style={{ color: "#333" }}>
            Scannez ce QR code pour vérifier l'authenticité et la validité de ce badge sur app.agricapital.ci
          </p>
        </div>
      </div>

      <div className="my-[2mm] flex items-center gap-[1mm]">
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
        <img src={symbole} alt="" className="h-[3mm] object-contain" />
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: "#C9C9C9" }} />
      </div>

      <div className="flex items-start gap-[2mm]">
        <div className="min-w-0 flex-1">
          <p className="text-[6pt] font-extrabold uppercase" style={{ color: VERT }}>AgriCapital SARL</p>
          <p className="text-[4.8pt] leading-[1.4]" style={{ color: "#333" }}>
            Société à Responsabilité Limitée<br />
            RCCM : CI-DAL-01-2025-B12-00035<br />
            Daloa-Gonaté, Côte d'Ivoire
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-[0.7mm]">
          {[
            { d: "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2 4.6 1v3.4A2 2 0 0 1 18 21.6 18 18 0 0 1 2.4 6 2 2 0 0 1 4.4 4h3.4l1 4.6-2.2 2.2Z", t: carte.telephone || "+225 07 50 56 60 87" },
            { d: "M2 5h20v14H2V5Zm10 8L3.5 6.6 12 12l8.5-5.4L12 13Z", t: "contact@agricapital.ci" },
            { d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c1.6 2 2.4 4 2.4 6s-.8 4-2.4 6c-1.6-2-2.4-4-2.4-6s.8-4 2.4-6ZM4.3 9h3.3a16 16 0 0 0 0 6H4.3a8 8 0 0 1 0-6Zm12.1 0h3.3a8 8 0 0 1 0 6h-3.3a16 16 0 0 0 0-6Z", t: "www.agricapital.ci" },
            { d: "M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z", t: "Cocody, Abidjan – Côte d'Ivoire" },
          ].map((c) => (
            <p key={c.t} className="flex items-center gap-[1mm] text-[4.6pt] leading-tight" style={{ color: "#333" }}>
              <span className="flex h-[3.2mm] w-[3.2mm] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: VERT }}>
                <svg viewBox="0 0 24 24" className="h-[2.1mm] w-[2.1mm]" fill="#fff" aria-hidden><path d={c.d} /></svg>
              </span>
              <span className="truncate">{c.t}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  </div>
));
CarteVerso.displayName = "CarteVerso";
