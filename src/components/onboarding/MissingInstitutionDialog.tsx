import { useState } from "react";
import { BottomSheet } from "../common/BottomSheet";
import {
  MAX_INSTITUTION_NAME_LENGTH,
  buildSupportMessage,
  buildWhatsAppUrl,
  cleanInstitutionName,
  requiredParents,
  type MissingInstitutionKind,
} from "../../utils/whatsapp";

interface MissingInstitutionDialogProps {
  open: boolean;
  kind: MissingInstitutionKind;
  onClose: () => void;
  /** Normalized digits-only support number, or null when not configured. */
  supportNumber: string | null;
  /** Selected parents by display name (null = not selected). */
  universityName: string | null;
  facultyName: string | null;
  /** The student followed the WhatsApp link with this name. NOT "sent". */
  onOpenedWhatsApp: (kind: MissingInstitutionKind, name: string) => void;
}

const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-azure-500 px-5 py-2 font-semibold text-white shadow-md transition-colors hover:bg-azure-600";
const disabledClass =
  "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg bg-gray-400 px-5 py-2 font-semibold text-white";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-transparent px-5 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800";

/**
 * "Can't find your university / faculty / department?" — collects the missing
 * name, shows the parents it hangs under, and hands the student a pre-filled
 * WhatsApp message to review and send themselves. Nothing is sent from here,
 * and nothing about the onboarding form changes when it opens or closes.
 */
export const MissingInstitutionDialog = ({
  open,
  kind,
  onClose,
  supportNumber,
  universityName,
  facultyName,
  onOpenedWhatsApp,
}: MissingInstitutionDialogProps) => {
  const [name, setName] = useState("");
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const parents = requiredParents(kind);
  const missingParents: string[] = [];
  if (parents.includes("university") && !universityName) {
    missingParents.push("university");
  }
  if (parents.includes("faculty") && !facultyName) missingParents.push("faculty");

  const message = buildSupportMessage({
    kind,
    missingName: name,
    universityName,
    facultyName,
  });
  const url = message ? buildWhatsAppUrl(supportNumber, message) : null;
  const cleanName = cleanInstitutionName(name);

  const close = () => {
    setName("");
    setOpened(false);
    setCopied(false);
    onClose();
  };

  const copyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const inputId = `missing-${kind}-name`;
  const canCopy =
    typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";

  const footer = (
    // `own-links`: opt out of the global blue link colour so the button's white
    // text isn't overridden (see index.css).
    <div className="own-links flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={close} className={secondaryClass}>
        {opened ? "Done" : "Cancel"}
      </button>
      {supportNumber &&
        (url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setOpened(true);
              onOpenedWhatsApp(kind, cleanName);
            }}
            className={primaryClass}
          >
            {opened ? "Open WhatsApp again" : "Continue to WhatsApp"}
          </a>
        ) : (
          <button type="button" disabled className={disabledClass}>
            Continue to WhatsApp
          </button>
        ))}
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={`Can't find your ${kind}?`}
      description="Tell us what's missing and we'll help add it, on WhatsApp."
      footer={footer}
    >
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        {!supportNumber && (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            WhatsApp support isn't available right now. Your progress is saved
            on this device — please come back and try again a little later.
          </p>
        )}

        {(parents.length > 0 || universityName) && (
          <dl className="space-y-1 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            {parents.includes("university") && (
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">University:</dt>
                <dd className="min-w-0 break-words">
                  {universityName ?? <em>not selected</em>}
                </dd>
              </div>
            )}
            {parents.includes("faculty") && (
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium">Faculty:</dt>
                <dd className="min-w-0 break-words">
                  {facultyName ?? <em>not selected</em>}
                </dd>
              </div>
            )}
          </dl>
        )}

        {missingParents.length > 0 && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            Choose your {missingParents.join(" and ")} first, so support knows
            where to add it.
          </p>
        )}

        <div>
          <label htmlFor={inputId} className="mb-2 block font-medium">
            Name of your missing {kind}
          </label>
          <input
            id={inputId}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setCopied(false);
            }}
            maxLength={MAX_INSTITUTION_NAME_LENGTH}
            disabled={missingParents.length > 0}
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-azure-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {message && supportNumber && (
          <div>
            <p className="mb-1 font-medium">Message you'll review in WhatsApp</p>
            <pre
              data-testid="support-message-preview"
              className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-sans text-xs dark:bg-gray-800"
            >
              {message}
            </pre>
          </div>
        )}

        <p className="text-gray-600 dark:text-gray-400">
          Your progress will be saved. Once your institution is available,
          return here to continue onboarding.
        </p>

        {opened && (
          <div
            role="status"
            className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
          >
            <p>
              We opened WhatsApp with your message. Review it and press send
              there — nothing has been sent yet. Then come back and tap
              “I've contacted support — check again”.
            </p>
            <p>
              Didn't open? Message{" "}
              <span className="font-semibold">+{supportNumber}</span> on
              WhatsApp yourself
              {canCopy ? ", or copy the message:" : "."}
            </p>
            {canCopy && (
              <button
                type="button"
                onClick={copyMessage}
                className="bg-transparent p-0 font-semibold underline underline-offset-2"
              >
                {copied ? "Copied" : "Copy message"}
              </button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
