import React, { useRef } from "react";
import type { OrderReceipt } from "../../types";

interface ReceiptDisplayProps {
  receipt: OrderReceipt;
  onConfirm: (receiptId: number) => Promise<void>;
  onDelete: (receiptId: number) => Promise<void>;
  getFileType: (imagePath: string) => 'image' | 'pdf' | null;
  onViewImage: (src: string, type: 'image' | 'pdf', title: string) => void;
  onViewPdf: (dataUri: string) => void;
  /** When set with a draft receipt that already has a file, shows Replace (PUT receipt with new file). */
  canReplaceDraftUpload?: boolean;
  onReplaceUploadedFile?: (file: File) => Promise<void>;
  t: (key: string) => string | undefined;
}

export const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  receipt,
  onConfirm,
  onDelete,
  getFileType,
  onViewImage,
  onViewPdf,
  canReplaceDraftUpload = false,
  onReplaceUploadedFile,
  t,
}) => {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const hasPreviewableFile = getFileType(receipt.imagePath) !== null;
  const showReplace =
    receipt.status === "draft" &&
    canReplaceDraftUpload &&
    !!onReplaceUploadedFile &&
    hasPreviewableFile;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        {receipt.status === 'draft' && (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-200 text-yellow-800">
            Draft
          </span>
        )}
        {receipt.status === 'draft' && (
          <div className="flex flex-wrap gap-2 justify-end">
            {showReplace ? (
              <>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!file || !onReplaceUploadedFile) return;
                    try {
                      await onReplaceUploadedFile(file);
                    } catch (error: unknown) {
                      console.error("Error replacing receipt file:", error);
                      const err = error as { data?: { message?: string }; message?: string };
                      alert(err?.data?.message || err?.message || t("orders.failedToReplaceUpload"));
                    }
                  }}
                />
                <button
                  type="button"
                  title={t("orders.replaceUploadTooltip")}
                  onClick={() => replaceInputRef.current?.click()}
                  className="px-3 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  {t("orders.replaceUpload")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(t("orders.confirmReceiptQuestion"))) {
                  try {
                    await onConfirm(receipt.id);
                  } catch (error: any) {
                    console.error("Error confirming receipt:", error);
                    const errorMessage = error?.data?.message || error?.message || t("orders.failedToConfirmReceipt");
                    alert(errorMessage);
                  }
                }
              }}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              {t("common.confirm")}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(t("orders.deleteReceiptQuestion"))) {
                  try {
                    await onDelete(receipt.id);
                  } catch (error: any) {
                    console.error("Error deleting receipt:", error);
                    const errorMessage = error?.data?.message || error?.message || t("orders.failedToDeleteReceipt");
                    alert(errorMessage);
                  }
                }
              }}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              {t("common.delete")}
            </button>
          </div>
        )}
      </div>
      {getFileType(receipt.imagePath) === 'image' ? (
        <img
          src={receipt.imagePath}
          alt="Receipt"
          className="w-48 h-72 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity mb-2"
          onClick={() => onViewImage(receipt.imagePath, 'image', t("orders.receiptUploads"))}
        />
      ) : getFileType(receipt.imagePath) === 'pdf' ? (
        <div
          className="w-48 h-72 flex flex-col items-center justify-center bg-slate-50 border-2 border-slate-200 rounded cursor-pointer hover:bg-slate-100 transition-colors mb-2"
          onClick={() => onViewPdf(receipt.imagePath)}
        >
          <svg
            className="w-8 h-8 text-red-500 mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-slate-600">PDF</p>
        </div>
      ) : null}
      <p className="text-xs text-slate-700 font-medium">
        {t("orders.amount")}: {receipt.amount}
      </p>
      {receipt.accountName && (
        <p className="text-xs text-slate-500">
          {t("orders.account")}: {receipt.accountName}
        </p>
      )}
    </div>
  );
};

