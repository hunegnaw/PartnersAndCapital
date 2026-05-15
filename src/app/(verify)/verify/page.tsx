"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Check,
  Upload,
  FileText,
  Lock,
  Zap,
  ClipboardCheck,
  Hourglass,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Circle,
} from "lucide-react";

type Screen = "gate" | "identity" | "accreditation" | "review" | "pending";

const SCREENS: Screen[] = [
  "gate",
  "identity",
  "accreditation",
  "review",
  "pending",
];

const SCREEN_LABELS = [
  "Portal Access",
  "Identity",
  "Accreditation",
  "Review",
  "Complete",
];

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Switzerland",
  "Singapore",
  "Japan",
  "Other",
];

const ID_DOC_TYPES = [
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver\u2019s license" },
  { value: "NATIONAL_ID", label: "National ID" },
];

const ACCREDITATION_BASES = [
  {
    value: "INCOME_INDIVIDUAL",
    label: "Individual Income",
    desc: "Income exceeding $200,000 in each of the two most recent years",
  },
  {
    value: "INCOME_JOINT",
    label: "Joint Income",
    desc: "Joint income with spouse exceeding $300,000 in each of the two most recent years",
  },
  {
    value: "NET_WORTH",
    label: "Net Worth",
    desc: "Individual or joint net worth exceeding $1,000,000 (excluding primary residence)",
  },
  {
    value: "PROFESSIONAL_LICENSE",
    label: "Professional License",
    desc: "Holder of Series 7, 65, or 82 license in good standing",
  },
  {
    value: "ENTITY_INVESTOR",
    label: "Entity Investor",
    desc: "Entity with assets exceeding $5,000,000 or all equity owners are accredited",
  },
];

const ACCREDITATION_DOC_TYPES = [
  "CPA Letter",
  "Attorney Letter",
  "Tax Return",
  "Pay Stubs",
  "1099",
];

interface VerificationData {
  id?: string;
  status: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  idDocumentType: string | null;
  idDocumentPath: string | null;
  idDocumentName: string | null;
  accreditationBasis: string | null;
  accreditationDocType: string | null;
  accreditationDocPath: string | null;
  accreditationDocName: string | null;
  rejectionReason: string | null;
}

export default function VerifyPage() {
  const { data: session } = useSession();
  const [screen, setScreen] = useState<Screen>("gate");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identity fields
  const [legalFirstName, setLegalFirstName] = useState("");
  const [legalLastName, setLegalLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentName, setIdDocumentName] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  // Accreditation fields
  const [accreditationBasis, setAccreditationBasis] = useState("");
  const [accreditationDocType, setAccreditationDocType] = useState("");
  const [accreditationDocName, setAccreditationDocName] = useState("");
  const [accreditationFile, setAccreditationFile] = useState<File | null>(null);
  const [uploadingAccreditation, setUploadingAccreditation] = useState(false);

  // Consent
  const [consentAccuracy, setConsentAccuracy] = useState(false);
  const [consentDataHandling, setConsentDataHandling] = useState(false);
  const [consentScreening, setConsentScreening] = useState(false);

  // Rejection
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const idFileRef = useRef<HTMLInputElement>(null);
  const accreditFileRef = useRef<HTMLInputElement>(null);

  const loadVerification = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/verify");
      if (!res.ok) return;
      const data = await res.json();
      const v: VerificationData | null = data.verification;
      if (!v) return;

      if (v.status === "SUBMITTED") {
        setScreen("pending");
      } else if (v.status === "APPROVED") {
        window.location.href = "/dashboard";
        return;
      } else if (v.status === "REJECTED") {
        setRejectionReason(v.rejectionReason || "Your verification was not approved.");
        setScreen("gate");
      } else if (v.status === "IN_PROGRESS") {
        // Resume where they left off
        if (v.accreditationBasis) {
          setScreen("review");
        } else if (v.legalFirstName) {
          setScreen("accreditation");
        } else {
          setScreen("identity");
        }
      }

      // Populate fields
      if (v.legalFirstName) setLegalFirstName(v.legalFirstName);
      if (v.legalLastName) setLegalLastName(v.legalLastName);
      if (v.dateOfBirth)
        setDateOfBirth(new Date(v.dateOfBirth).toISOString().split("T")[0]);
      if (v.country) setCountry(v.country);
      if (v.address) setAddress(v.address);
      if (v.city) setCity(v.city);
      if (v.zipCode) setZipCode(v.zipCode);
      if (v.idDocumentType) setIdDocumentType(v.idDocumentType);
      if (v.idDocumentName) setIdDocumentName(v.idDocumentName);
      if (v.accreditationBasis) setAccreditationBasis(v.accreditationBasis);
      if (v.accreditationDocType)
        setAccreditationDocType(v.accreditationDocType);
      if (v.accreditationDocName)
        setAccreditationDocName(v.accreditationDocName);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadVerification());
  }, [loadVerification]);

  // Pre-fill name from session
  const sessionName = session?.user?.name;
  useEffect(() => {
    if (sessionName && !legalFirstName && !legalLastName) {
      const parts = sessionName.split(" ");
      Promise.resolve().then(() => {
        setLegalFirstName(parts[0] || "");
        setLegalLastName(parts.slice(1).join(" ") || "");
      });
    }
  }, [sessionName, legalFirstName, legalLastName]);

  async function handleStartVerification() {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/portal/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      setScreen("identity");
    } catch {
      setError("Failed to start verification");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveIdentity() {
    setSaving(true);
    setError(null);
    try {
      // Upload file first if selected
      if (idFile) {
        setUploadingId(true);
        const formData = new FormData();
        formData.append("file", idFile);
        formData.append("category", "identity");
        const uploadRes = await fetch("/api/portal/verify/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || "Upload failed");
        }
        setIdDocumentName(idFile.name);
        setUploadingId(false);
      }

      const res = await fetch("/api/portal/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalFirstName,
          legalLastName,
          dateOfBirth,
          country,
          address,
          city,
          zipCode,
          idDocumentType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setScreen("accreditation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save identity");
    } finally {
      setSaving(false);
      setUploadingId(false);
    }
  }

  async function handleSaveAccreditation() {
    setSaving(true);
    setError(null);
    try {
      // Upload file first
      if (accreditationFile) {
        setUploadingAccreditation(true);
        const formData = new FormData();
        formData.append("file", accreditationFile);
        formData.append("category", "accreditation");
        formData.append("accreditationDocType", accreditationDocType);
        const uploadRes = await fetch("/api/portal/verify/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || "Upload failed");
        }
        setAccreditationDocName(accreditationFile.name);
        setUploadingAccreditation(false);
      }

      const res = await fetch("/api/portal/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accreditationBasis,
          accreditationDocType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setScreen("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save accreditation"
      );
    } finally {
      setSaving(false);
      setUploadingAccreditation(false);
    }
  }

  async function handleSubmit() {
    if (!consentAccuracy || !consentDataHandling || !consentScreening) {
      setError("All consent checkboxes must be accepted");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/verify/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentAccuracy,
          consentDataHandling,
          consentScreening,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }
      setScreen("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const currentIndex = SCREENS.indexOf(screen);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A2640]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Progress bar */}
      <div className="bg-[#1A2640] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {SCREEN_LABELS.map((label, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`hidden sm:block w-8 lg:w-16 h-px ${
                        done ? "bg-[#B07D3A]" : "bg-white/20"
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        done
                          ? "bg-[#B07D3A] text-white"
                          : active
                            ? "bg-white text-[#1A2640]"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={`hidden sm:inline text-xs font-medium ${
                        done
                          ? "text-[#B07D3A]"
                          : active
                            ? "text-white"
                            : "text-white/40"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {screen === "gate" && (
          <GateScreen
            rejectionReason={rejectionReason}
            saving={saving}
            onStart={handleStartVerification}
          />
        )}
        {screen === "identity" && (
          <IdentityScreen
            legalFirstName={legalFirstName}
            legalLastName={legalLastName}
            dateOfBirth={dateOfBirth}
            country={country}
            address={address}
            city={city}
            zipCode={zipCode}
            idDocumentType={idDocumentType}
            idDocumentName={idDocumentName}
            idFile={idFile}
            uploadingId={uploadingId}
            saving={saving}
            idFileRef={idFileRef}
            onFirstNameChange={setLegalFirstName}
            onLastNameChange={setLegalLastName}
            onDobChange={setDateOfBirth}
            onCountryChange={setCountry}
            onAddressChange={setAddress}
            onCityChange={setCity}
            onZipChange={setZipCode}
            onIdDocTypeChange={setIdDocumentType}
            onIdFileChange={setIdFile}
            onContinue={handleSaveIdentity}
            onBack={() => setScreen("gate")}
          />
        )}
        {screen === "accreditation" && (
          <AccreditationScreen
            accreditationBasis={accreditationBasis}
            accreditationDocType={accreditationDocType}
            accreditationDocName={accreditationDocName}
            accreditationFile={accreditationFile}
            uploadingAccreditation={uploadingAccreditation}
            saving={saving}
            accreditFileRef={accreditFileRef}
            onBasisChange={setAccreditationBasis}
            onDocTypeChange={setAccreditationDocType}
            onFileChange={setAccreditationFile}
            onContinue={handleSaveAccreditation}
            onBack={() => setScreen("identity")}
          />
        )}
        {screen === "review" && (
          <ReviewScreen
            legalFirstName={legalFirstName}
            legalLastName={legalLastName}
            country={country}
            idDocumentType={idDocumentType}
            idDocumentName={idDocumentName}
            accreditationBasis={accreditationBasis}
            accreditationDocType={accreditationDocType}
            accreditationDocName={accreditationDocName}
            consentAccuracy={consentAccuracy}
            consentDataHandling={consentDataHandling}
            consentScreening={consentScreening}
            submitting={submitting}
            onConsentAccuracy={setConsentAccuracy}
            onConsentDataHandling={setConsentDataHandling}
            onConsentScreening={setConsentScreening}
            onEditIdentity={() => setScreen("identity")}
            onEditAccreditation={() => setScreen("accreditation")}
            onSubmit={handleSubmit}
            onBack={() => setScreen("accreditation")}
          />
        )}
        {screen === "pending" && <PendingScreen />}
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 1: GATE
   ============================================================ */
function GateScreen({
  rejectionReason,
  saving,
  onStart,
}: {
  rejectionReason: string | null;
  saving: boolean;
  onStart: () => void;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        {rejectionReason && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
            <p className="text-sm font-medium mb-1">Verification returned for revision</p>
            <p className="text-sm">{rejectionReason}</p>
          </div>
        )}
        <span className="inline-block bg-[#B07D3A]/10 text-[#B07D3A] text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide uppercase">
          One-time verification
        </span>
        <h1 className="text-3xl font-bold text-[#1A2640] mb-4">
          Before we hand over the keys.
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Partners + Capital is required to verify your identity and accredited
          investor status before granting access to your portfolio. This is a
          one-time step.
        </p>
        <div className="space-y-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Lock className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="font-medium text-[#1A2640]">Your data stays secure</p>
              <p className="text-sm text-gray-500">
                Documents are encrypted with AES-256 and stored securely by
                Partners + Capital.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-full bg-[#B07D3A]/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-[#B07D3A]" />
            </div>
            <div>
              <p className="font-medium text-[#1A2640]">Takes under 5 minutes</p>
              <p className="text-sm text-gray-500">
                Most investors complete this in a single sitting.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="font-medium text-[#1A2640]">Required by law</p>
              <p className="text-sm text-gray-500">
                Reg D 506(c) and OFAC sanctions screening are federal
                requirements.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={saving}
          className="bg-[#1A2640] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2C3E5C] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {rejectionReason ? "Restart Verification" : "Begin Verification"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h3 className="text-lg font-semibold text-[#1A2640] mb-6">
          What we verify
        </h3>
        <div className="space-y-3 mb-6">
          {[
            "Identity confirmation",
            "Sanctions screening",
            "Accredited investor status",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-[#B07D3A] flex-shrink-0" />
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 mb-6">
          {[
            "No account numbers needed",
            "No credit check",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="w-4 text-center text-gray-400 flex-shrink-0">&mdash;</span>
              <span className="text-sm text-gray-400">{item}</span>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Verification is processed and stored securely by Partners + Capital.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 2: IDENTITY
   ============================================================ */
function IdentityScreen({
  legalFirstName,
  legalLastName,
  dateOfBirth,
  country,
  address,
  city,
  zipCode,
  idDocumentType,
  idDocumentName,
  idFile,
  uploadingId,
  saving,
  idFileRef,
  onFirstNameChange,
  onLastNameChange,
  onDobChange,
  onCountryChange,
  onAddressChange,
  onCityChange,
  onZipChange,
  onIdDocTypeChange,
  onIdFileChange,
  onContinue,
  onBack,
}: {
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  country: string;
  address: string;
  city: string;
  zipCode: string;
  idDocumentType: string;
  idDocumentName: string;
  idFile: File | null;
  uploadingId: boolean;
  saving: boolean;
  idFileRef: React.RefObject<HTMLInputElement | null>;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onDobChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onZipChange: (v: string) => void;
  onIdDocTypeChange: (v: string) => void;
  onIdFileChange: (v: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const canContinue =
    legalFirstName &&
    legalLastName &&
    dateOfBirth &&
    country &&
    address &&
    city &&
    zipCode &&
    idDocumentType &&
    (idDocumentName || idFile);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1A2640] mb-2">
        Confirm your identity
      </h2>
      <p className="text-gray-500 mb-8">
        Enter your legal name and address as they appear on your government-issued ID.
      </p>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Legal First Name *
              </label>
              <input
                type="text"
                value={legalFirstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Legal Last Name *
              </label>
              <input
                type="text"
                value={legalLastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date of Birth *
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => onDobChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Country of Citizenship *
            </label>
            <select
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none bg-white"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Residential Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
              placeholder="123 Main St, Apt 4"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ZIP Code *
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => onZipChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2640]/20 focus:border-[#1A2640] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: ID Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-[#1A2640] mb-4">
            Upload your ID *
          </h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {ID_DOC_TYPES.map((dt) => (
              <button
                key={dt.value}
                type="button"
                onClick={() => onIdDocTypeChange(dt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  idDocumentType === dt.value
                    ? "bg-[#1A2640] text-white border-[#1A2640]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>

          <div
            onClick={() => idFileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#B07D3A] transition-colors"
          >
            <input
              ref={idFileRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onIdFileChange(f);
              }}
            />
            {uploadingId ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#B07D3A] mx-auto" />
            ) : idFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#B07D3A]" />
                <span className="text-sm font-medium">{idFile.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onIdFileChange(null);
                  }}
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : idDocumentName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#B07D3A]" />
                <span className="text-sm font-medium">{idDocumentName}</span>
                <span className="text-xs text-gray-400">(uploaded)</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click or drag to upload your ID document
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, PNG, JPG, DOC (max 50MB)
                </p>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700">
              <strong>OFAC Screening:</strong> All investors are screened
              against the U.S. Treasury OFAC sanctions list as required by
              federal law.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue || saving}
          className="bg-[#1A2640] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2C3E5C] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue to accreditation
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 3: ACCREDITATION
   ============================================================ */
function AccreditationScreen({
  accreditationBasis,
  accreditationDocType,
  accreditationDocName,
  accreditationFile,
  uploadingAccreditation,
  saving,
  accreditFileRef,
  onBasisChange,
  onDocTypeChange,
  onFileChange,
  onContinue,
  onBack,
}: {
  accreditationBasis: string;
  accreditationDocType: string;
  accreditationDocName: string;
  accreditationFile: File | null;
  uploadingAccreditation: boolean;
  saving: boolean;
  accreditFileRef: React.RefObject<HTMLInputElement | null>;
  onBasisChange: (v: string) => void;
  onDocTypeChange: (v: string) => void;
  onFileChange: (v: File | null) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const canContinue =
    accreditationBasis &&
    accreditationDocType &&
    (accreditationDocName || accreditationFile);

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1A2640] mb-2">
        Confirm accredited investor status
      </h2>
      <p className="text-gray-500 mb-8">
        Select the basis for your accreditation and upload supporting documentation.
      </p>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Accreditation basis */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Accreditation Basis *
          </label>
          {ACCREDITATION_BASES.map((basis) => (
            <label
              key={basis.value}
              className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                accreditationBasis === basis.value
                  ? "border-[#1A2640] bg-[#1A2640]/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="accreditationBasis"
                  value={basis.value}
                  checked={accreditationBasis === basis.value}
                  onChange={(e) => onBasisChange(e.target.value)}
                  className="mt-0.5 accent-[#1A2640]"
                />
                <div>
                  <p className="text-sm font-medium text-[#1A2640]">
                    {basis.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{basis.desc}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Right: Document upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-[#1A2640] mb-4">
            Supporting documentation *
          </h3>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Document Type
          </label>
          <div className="flex flex-wrap gap-2 mb-6">
            {ACCREDITATION_DOC_TYPES.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => onDocTypeChange(dt)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  accreditationDocType === dt
                    ? "bg-[#1A2640] text-white border-[#1A2640]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {dt}
              </button>
            ))}
          </div>

          <div
            onClick={() => accreditFileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#B07D3A] transition-colors"
          >
            <input
              ref={accreditFileRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileChange(f);
              }}
            />
            {uploadingAccreditation ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#B07D3A] mx-auto" />
            ) : accreditationFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#B07D3A]" />
                <span className="text-sm font-medium">
                  {accreditationFile.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileChange(null);
                  }}
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : accreditationDocName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#B07D3A]" />
                <span className="text-sm font-medium">
                  {accreditationDocName}
                </span>
                <span className="text-xs text-gray-400">(uploaded)</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click or drag to upload your document
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, PNG, JPG, DOC, XLS (max 50MB)
                </p>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs text-green-800">
              <strong>Your documents stay private.</strong> Documents are encrypted
              with AES-256 and stored securely.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue || saving}
          className="bg-[#1A2640] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#2C3E5C] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Review & submit
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN 4: REVIEW
   ============================================================ */
function ReviewScreen({
  legalFirstName,
  legalLastName,
  country,
  idDocumentType,
  idDocumentName,
  accreditationBasis,
  accreditationDocType,
  accreditationDocName,
  consentAccuracy,
  consentDataHandling,
  consentScreening,
  submitting,
  onConsentAccuracy,
  onConsentDataHandling,
  onConsentScreening,
  onEditIdentity,
  onEditAccreditation,
  onSubmit,
  onBack,
}: {
  legalFirstName: string;
  legalLastName: string;
  country: string;
  idDocumentType: string;
  idDocumentName: string;
  accreditationBasis: string;
  accreditationDocType: string;
  accreditationDocName: string;
  consentAccuracy: boolean;
  consentDataHandling: boolean;
  consentScreening: boolean;
  submitting: boolean;
  onConsentAccuracy: (v: boolean) => void;
  onConsentDataHandling: (v: boolean) => void;
  onConsentScreening: (v: boolean) => void;
  onEditIdentity: () => void;
  onEditAccreditation: () => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const basisLabel =
    ACCREDITATION_BASES.find((b) => b.value === accreditationBasis)?.label ||
    accreditationBasis;
  const idTypeLabel =
    ID_DOC_TYPES.find((d) => d.value === idDocumentType)?.label ||
    idDocumentType;
  const allConsented = consentAccuracy && consentDataHandling && consentScreening;

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1A2640] mb-2">
        Review & Submit
      </h2>
      <p className="text-gray-500 mb-8">
        Please review your information before submitting for verification.
      </p>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Identity card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#1A2640]">
              Identity Information
            </h3>
            <button
              onClick={onEditIdentity}
              className="text-xs text-[#B07D3A] font-medium hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Full name" value={`${legalFirstName} ${legalLastName}`} />
            <Row label="Country" value={country} />
            <Row label="ID type" value={`${idTypeLabel}`} badge={idDocumentName ? "uploaded \u2713" : undefined} />
            <Row label="OFAC screening" value="Will run on submit" muted />
          </div>
        </div>

        {/* Accreditation card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#1A2640]">
              Accreditation Information
            </h3>
            <button
              onClick={onEditAccreditation}
              className="text-xs text-[#B07D3A] font-medium hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Basis" value={basisLabel} />
            <Row label="Documentation" value={accreditationDocType} badge={accreditationDocName ? "uploaded \u2713" : undefined} />
            <Row label="P+C receives" value="Status only" muted />
          </div>
        </div>
      </div>

      {/* Consent */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="text-base font-semibold text-[#1A2640] mb-4">
          Consent & Acknowledgments
        </h3>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccuracy}
              onChange={(e) => onConsentAccuracy(e.target.checked)}
              className="mt-0.5 accent-[#1A2640]"
            />
            <span className="text-sm text-gray-700">
              I certify that the information provided is accurate and complete to
              the best of my knowledge. *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentDataHandling}
              onChange={(e) => onConsentDataHandling(e.target.checked)}
              className="mt-0.5 accent-[#1A2640]"
            />
            <span className="text-sm text-gray-700">
              I consent to Partners + Capital processing and storing my personal
              data for verification purposes. *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentScreening}
              onChange={(e) => onConsentScreening(e.target.checked)}
              className="mt-0.5 accent-[#1A2640]"
            />
            <span className="text-sm text-gray-700">
              I consent to OFAC and sanctions screening as required by federal
              regulations. *
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!allConsented || submitting}
          className="bg-[#B07D3A] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#9A6B2E] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit verification
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, badge, muted }: { label: string; value: string; badge?: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-right max-w-[60%] truncate flex items-center gap-2 ${muted ? "text-gray-400 font-normal italic" : "text-[#1A2640]"}`}>
        {value}
        {badge && (
          <span className="text-xs text-green-600 font-normal">{badge}</span>
        )}
      </span>
    </div>
  );
}

/* ============================================================
   SCREEN 5: PENDING
   ============================================================ */
function PendingScreen() {
  const steps = [
    { label: "Documents received", status: "done" as const },
    { label: "OFAC screening initiated", status: "done" as const },
    { label: "Accreditation review", status: "pending" as const },
    { label: "Portfolio access granted", status: "waiting" as const },
  ];

  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-full bg-[#B07D3A]/10 flex items-center justify-center mx-auto mb-6">
        <Hourglass className="h-8 w-8 text-[#B07D3A]" />
      </div>
      <h2 className="text-2xl font-bold text-[#1A2640] mb-3">
        Verification submitted.
      </h2>
      <p className="text-gray-500 mb-8">
        Your documents are currently under review. We&apos;ll notify you as soon
        as the process is complete.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-left mb-8">
        <h3 className="text-sm font-semibold text-[#1A2640] mb-4">
          Verification Status
        </h3>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              {step.status === "done" ? (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : step.status === "pending" ? (
                <Hourglass className="h-4 w-4 text-[#B07D3A] flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  step.status === "done"
                    ? "text-gray-700"
                    : step.status === "pending"
                      ? "text-[#B07D3A] font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Your advisor has been notified that your verification is in progress.
      </p>
    </div>
  );
}
