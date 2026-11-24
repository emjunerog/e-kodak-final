import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Upload,
  Sparkles,
  Sliders,
  Eye,
  Save,
  Trash2,
  Check,
  Image as ImageIcon,
  Layers,
  Loader2,
  ExternalLink,
  FileText,
  Pencil,
  Type,
  ArrowLeft,
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
  X,
  Lock,
  Move,
  RotateCcw,
  Undo2,
  Redo2,
} from 'lucide-react';
import YearbookPageCustom from './YearbookPageCustom';
import YearbookInstitutionalSheet from './YearbookInstitutionalSheet';
import {
  DEFAULT_CUSTOM_TEMPLATE,
  INSTITUTIONAL_CATEGORIES,
  INSTITUTIONAL_FONT_OPTIONS,
  createDefaultInstitutionalData,
  isInstitutionalSectionPopulated,
  uploadYearbookTemplateAsset,
  extractTextFromPdf,
} from '../../../services/yearbookService';

/**
 * YearbookCustomTemplateStudio
 * ============================
 * Interactive workspace where Admin uploads Canva/Custom A4 PDF or image artwork
 * for every part of the yearbook (Covers, Title Page, School Message, Faculty,
 * Section Opener, Class Officers, Student Grid Pages, Memories, Back Cover) and
 * live-tweaks margins, grid spacing, cards, and typography over a wide A4 preview.
 */
function parseVmgoFromText(rawText = '') {
  const clean = String(rawText || '').trim();
  if (!clean) return {};
  const visionMatch = clean.match(/(?:^|\n)\s*vision\s*:?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:mission|goals?|objectives?)\s*:?)|$)/i);
  const missionMatch = clean.match(/(?:^|\n)\s*mission\s*:?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:vision|goals?|objectives?)\s*:?)|$)/i);
  const goalsMatch = clean.match(/(?:^|\n)\s*(?:goals?(?:\s*(?:&|and)\s*objectives?)?|objectives?)\s*:?\s*\n?([\s\S]*)$/i);

  if (visionMatch || missionMatch || goalsMatch) {
    return {
      ...(visionMatch?.[1]?.trim() ? { vision: visionMatch[1].trim() } : {}),
      ...(missionMatch?.[1]?.trim() ? { mission: missionMatch[1].trim() } : {}),
      ...(goalsMatch?.[1]?.trim() ? { goals: goalsMatch[1].trim() } : {}),
    };
  }
  return { vision: clean };
}

function normalizeStudioSnapshot(cfg = {}) {
  const defaultInst = createDefaultInstitutionalData();
  const rawInst = cfg.customTemplate?.institutionalData || {};
  const mergedInst = Object.fromEntries(
    Object.keys(defaultInst).map((key) => [
      key,
      {
        ...defaultInst[key],
        ...(rawInst[key] || {}),
      },
    ])
  );
  return {
    coverBgUrl: cfg.coverBgUrl || '',
    customTemplate: JSON.parse(
      JSON.stringify({
        ...DEFAULT_CUSTOM_TEMPLATE,
        ...(cfg.customTemplate || {}),
        institutionalData: mergedInst,
      })
    ),
  };
}

function StudioRangeCard({ label, valueLabel, value, min, max, step = 1, onChange }) {
  const safeVal = Number(value ?? min);
  const pct = max > min ? Math.min(100, Math.max(0, ((safeVal - min) / (max - min)) * 100)) : 0;
  return (
    <div className="p-2.5 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-neutral-800 truncate">{label}</span>
        <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200/70 font-mono text-[10px] font-bold text-amber-800 shrink-0">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeVal}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, #b47b2b 0%, #d4af37 ${pct}%, #e5e5e5 ${pct}%, #e5e5e5 100%)`,
        }}
        className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900 [&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-amber-400 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900 [&::-moz-range-thumb]:border-[2.5px] [&::-moz-range-thumb]:border-amber-400"
      />
    </div>
  );
}

StudioRangeCard.propTypes = {
  label: PropTypes.string.isRequired,
  valueLabel: PropTypes.string.isRequired,
  value: PropTypes.number,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

export default function YearbookCustomTemplateStudio({
  config = {},
  students = [],
  onUpdateConfig,
  presets = [],
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onSwitchToCustomTheme,
  onOpenPrintPreview,
}) {
  const defaultInstitutional = createDefaultInstitutionalData();
  const rawInstitutional = config.customTemplate?.institutionalData || {};
  const institutionalData = Object.fromEntries(
    Object.keys(defaultInstitutional).map((key) => [
      key,
      {
        ...defaultInstitutional[key],
        ...(rawInstitutional[key] || {}),
      },
    ])
  );

  const tpl = {
    ...DEFAULT_CUSTOM_TEMPLATE,
    ...(config.customTemplate || {}),
    institutionalData,
  };

  const [uploadingSlot, setUploadingSlot] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showPresetsDrawer, setShowPresetsDrawer] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState('backgrounds'); // 'backgrounds' | 'layout' | 'typography'
  const [previewPartKey, setPreviewPartKey] = useState('interiorBgUrl');
  const [activeInstitutionalKey, setActiveInstitutionalKey] = useState('vmgo');
  const [isInstitutionalEditable, setIsInstitutionalEditable] = useState(true);
  const [isPreviewTextActive, setIsPreviewTextActive] = useState(false);
  const [hoveredLeftCat, setHoveredLeftCat] = useState('');
  const [hoveredRightTool, setHoveredRightTool] = useState('');
  const previewStageRef = useRef(null);
  const blockSeqRef = useRef(0);
  const configRef = useRef(config);
  const historyRef = useRef({ past: [], future: [] });
  const coalesceActiveRef = useRef(false);
  const coalesceTimerRef = useRef(null);
  const [historyState, setHistoryState] = useState({ past: [], future: [] });

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(
    () => () => {
      if (coalesceTimerRef.current) window.clearTimeout(coalesceTimerRef.current);
    },
    []
  );

  const createBlockId = (prefix) => {
    blockSeqRef.current += 1;
    return `${prefix}-${blockSeqRef.current}`;
  };

  const resetCoalesce = () => {
    coalesceActiveRef.current = false;
    if (coalesceTimerRef.current) {
      window.clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  };

  const commitTrackedConfig = (nextConfig, { coalesce = true } = {}) => {
    const beforeSnap = normalizeStudioSnapshot(configRef.current);
    const afterSnap = normalizeStudioSnapshot(nextConfig);
    if (JSON.stringify(beforeSnap) !== JSON.stringify(afterSnap)) {
      const currentPast = historyRef.current.past;
      const shouldPush =
        !coalesce ||
        currentPast.length === 0 ||
        !coalesceActiveRef.current;
      const nextPast = shouldPush
        ? [...currentPast.slice(-49), beforeSnap]
        : currentPast;
      const nextHistory = { past: nextPast, future: [] };
      historyRef.current = nextHistory;
      setHistoryState(nextHistory);

      if (coalesce) {
        coalesceActiveRef.current = true;
        if (coalesceTimerRef.current) window.clearTimeout(coalesceTimerRef.current);
        coalesceTimerRef.current = window.setTimeout(() => {
          coalesceActiveRef.current = false;
          coalesceTimerRef.current = null;
        }, 450);
      } else {
        resetCoalesce();
      }
    }
    configRef.current = nextConfig;
    onUpdateConfig?.(nextConfig);
    onSwitchToCustomTheme?.();
  };

  const handleUndo = () => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const targetSnap = past[past.length - 1];
    const currentSnap = normalizeStudioSnapshot(configRef.current);
    const nextHistory = {
      past: past.slice(0, -1),
      future: [currentSnap, ...future].slice(0, 50),
    };
    historyRef.current = nextHistory;
    setHistoryState(nextHistory);
    resetCoalesce();

    const restored = {
      ...configRef.current,
      templateId: 'custom',
      coverBgUrl: targetSnap.coverBgUrl,
      customTemplate: targetSnap.customTemplate,
    };
    configRef.current = restored;
    onUpdateConfig?.(restored);
    onSwitchToCustomTheme?.();
  };

  const handleRedo = () => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const targetSnap = future[0];
    const currentSnap = normalizeStudioSnapshot(configRef.current);
    const nextHistory = {
      past: [...past, currentSnap].slice(-50),
      future: future.slice(1),
    };
    historyRef.current = nextHistory;
    setHistoryState(nextHistory);
    resetCoalesce();

    const restored = {
      ...configRef.current,
      templateId: 'custom',
      coverBgUrl: targetSnap.coverBgUrl,
      customTemplate: targetSnap.customTemplate,
    };
    configRef.current = restored;
    onUpdateConfig?.(restored);
    onSwitchToCustomTheme?.();
  };

  const undoRedoRef = useRef({ undo: handleUndo, redo: handleRedo });
  useEffect(() => {
    undoRedoRef.current = { undo: handleUndo, redo: handleRedo };
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (document.activeElement?.getAttribute?.('data-local-input') === 'true') return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        if (historyRef.current.past.length > 0) {
          e.preventDefault();
          undoRedoRef.current.undo();
        }
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
        if (historyRef.current.future.length > 0) {
          e.preventDefault();
          undoRedoRef.current.redo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateTemplate = (patch, options) => {
    const latestCfg = configRef.current || {};
    const latestRawInst = latestCfg.customTemplate?.institutionalData || {};
    const latestInst = Object.fromEntries(
      Object.keys(defaultInstitutional).map((key) => [
        key,
        {
          ...defaultInstitutional[key],
          ...(latestRawInst[key] || {}),
        },
      ])
    );
    const latestTpl = {
      ...DEFAULT_CUSTOM_TEMPLATE,
      ...(latestCfg.customTemplate || {}),
      institutionalData: latestInst,
    };
    const next = {
      ...latestCfg,
      templateId: 'custom',
      customTemplate: {
        ...latestTpl,
        ...patch,
      },
    };
    commitTrackedConfig(next, options);
  };

  const updateInstitutionalSection = (sectionKey, patch, options) => {
    const latestRawInst = configRef.current?.customTemplate?.institutionalData || {};
    const currentSec = {
      ...defaultInstitutional[sectionKey],
      ...(latestRawInst[sectionKey] || {}),
    };
    updateTemplate(
      {
        institutionalData: {
          ...institutionalData,
          ...(Object.fromEntries(
            Object.keys(defaultInstitutional).map((key) => [
              key,
              {
                ...defaultInstitutional[key],
                ...(latestRawInst[key] || {}),
              },
            ])
          )),
          [sectionKey]: {
            ...currentSec,
            ...patch,
          },
        },
      },
      options
    );
  };

  const handleAssetUpload = async (e, slotKey, isRootConfig = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slotKey);
    setUploadError('');
    setUploadNotice('');
    setPreviewPartKey(slotKey);
    try {
      const url = await uploadYearbookTemplateAsset(file, slotKey);
      if (isRootConfig) {
        commitTrackedConfig(
          { ...(configRef.current || {}), templateId: 'custom', [slotKey]: url },
          { coalesce: false }
        );
      } else {
        updateTemplate({ [slotKey]: url }, { coalesce: false });
      }
    } catch (err) {
      setUploadError(err?.message || 'Could not process the uploaded image or PDF.');
    } finally {
      setUploadingSlot('');
      e.target.value = '';
    }
  };

  const handleInstitutionalPhotoUpload = async (e, sectionKey, fieldName = 'photoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tag = `${sectionKey}:${fieldName}`;
    setUploadingSlot(tag);
    setUploadError('');
    setUploadNotice('');
    try {
      const url = await uploadYearbookTemplateAsset(file, `inst-${sectionKey}-${fieldName}`);
      updateInstitutionalSection(sectionKey, { [fieldName]: url });
    } catch (err) {
      setUploadError(err?.message || 'Could not upload portrait photo.');
    } finally {
      setUploadingSlot('');
      e.target.value = '';
    }
  };

  const handleInstitutionalPdfImport = async (e, sectionKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tag = `${sectionKey}:pdf`;
    setUploadingSlot(tag);
    setUploadError('');
    setUploadNotice('');
    try {
      const extractedText = await extractTextFromPdf(file);
      if (extractedText && extractedText.trim()) {
        if (sectionKey === 'vmgo') {
          const parsed = parseVmgoFromText(extractedText);
          updateInstitutionalSection(sectionKey, parsed);
          setUploadNotice('VMGO text imported from PDF. You can edit any wording directly in the preview.');
        } else if (sectionKey === 'programme') {
          updateInstitutionalSection(sectionKey, { body: extractedText.trim() });
          setUploadNotice('Graduation Programme text imported from PDF. Edit directly on the preview if needed.');
        } else {
          updateInstitutionalSection(sectionKey, { message: extractedText.trim() });
          setUploadNotice('Message imported from PDF. Edit wording or add name & photo directly on the sheet.');
        }
      } else {
        // Scanned / image-only PDF fallback: rasterize and attach onto the editable sheet
        const scanUrl = await uploadYearbookTemplateAsset(file, `inst-${sectionKey}-scan`);
        const currentBlocks = Array.isArray(institutionalData[sectionKey]?.extraBlocks)
          ? institutionalData[sectionKey].extraBlocks
          : [];
        updateInstitutionalSection(sectionKey, {
          extraBlocks: [
            ...currentBlocks,
            {
              id: createBlockId('scan'),
              type: 'image',
              url: scanUrl,
              xPct: 50,
              yPct: 56,
              widthPx: 220,
              caption: file.name,
            },
          ],
        });
        setUploadNotice('Scanned PDF page added directly onto the editable preview.');
      }
    } catch (err) {
      setUploadError(err?.message || 'Could not read PDF document. Try pasting the text directly.');
    } finally {
      setUploadingSlot('');
      e.target.value = '';
    }
  };

  const handleAddTextBlock = (sectionKey) => {
    const currentBlocks = Array.isArray(institutionalData[sectionKey]?.extraBlocks)
      ? institutionalData[sectionKey].extraBlocks
      : [];
    updateInstitutionalSection(sectionKey, {
      extraBlocks: [
        ...currentBlocks,
        {
          id: createBlockId('txt'),
          type: 'text',
          content: 'Additional note or signatory — drag to move or edit inline',
          xPct: 50,
          yPct: 86,
          widthPct: 72,
        },
      ],
    });
  };

  const handleAddImageBlock = async (e, sectionKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tag = `${sectionKey}:extraImg`;
    setUploadingSlot(tag);
    setUploadError('');
    try {
      const url = await uploadYearbookTemplateAsset(file, `inst-${sectionKey}-extra`);
      const currentBlocks = Array.isArray(institutionalData[sectionKey]?.extraBlocks)
        ? institutionalData[sectionKey].extraBlocks
        : [];
      updateInstitutionalSection(sectionKey, {
        extraBlocks: [
          ...currentBlocks,
          {
            id: createBlockId('img'),
            type: 'image',
            url,
            xPct: 50,
            yPct: 82,
            widthPx: 96,
            caption: file.name,
          },
        ],
      });
    } catch (err) {
      setUploadError(err?.message || 'Could not insert image.');
    } finally {
      setUploadingSlot('');
      e.target.value = '';
    }
  };

  const bgSlots = [
    {
      key: 'coverBgUrl',
      shortLabel: 'Front Cover',
      label: 'Front Cover Background',
      hint: 'Full-bleed A4 artwork behind front cover school crest & title.',
      value: config.coverBgUrl || '',
      isRoot: true,
    },
    {
      key: 'titlePageBgUrl',
      shortLabel: 'Title Page',
      label: 'Title & Institutional Seal Page',
      hint: 'Opening credits, alma mater page, or batch theme splash sheet.',
      value: tpl.titlePageBgUrl || '',
      isRoot: false,
    },
    {
      key: 'dedicationBgUrl',
      shortLabel: 'Message',
      label: 'School Message / Dedication',
      hint: 'Background behind the Principal, Dean, or Adviser commencement message.',
      value: tpl.dedicationBgUrl || '',
      isRoot: false,
    },
    {
      key: 'facultyBgUrl',
      shortLabel: 'Faculty',
      label: 'Faculty & Administration Page',
      hint: 'Department heads, teachers, and adviser spotlight sheet.',
      value: tpl.facultyBgUrl || '',
      isRoot: false,
    },
    {
      key: 'openerBgUrl',
      shortLabel: 'Opener',
      label: 'Section Opener / Divider',
      hint: 'Divider backdrop behind the section title and graduate portrait strip.',
      value: tpl.openerBgUrl || '',
      isRoot: false,
    },
    {
      key: 'officersBgUrl',
      shortLabel: 'Officers',
      label: 'Class Officers Feature Page',
      hint: 'Dedicated executive board & class leadership artwork sheet.',
      value: tpl.officersBgUrl || '',
      isRoot: false,
    },
    {
      key: 'interiorBgUrl',
      shortLabel: 'Graduates Grid',
      label: 'Student Grid Pages (Graduates A4)',
      hint: 'Your Canva border, header, and texture repeated behind every portrait page.',
      value: tpl.interiorBgUrl || '',
      isRoot: false,
    },
    {
      key: 'memoriesBgUrl',
      shortLabel: 'Memories',
      label: 'Candid Memories & Batch Collage',
      hint: 'Campus life, pictorial candids, and milestone collage page.',
      value: tpl.memoriesBgUrl || '',
      isRoot: false,
    },
    {
      key: 'backCoverBgUrl',
      shortLabel: 'Back Cover',
      label: 'Back Cover Background',
      hint: 'Closing A4 cover artwork.',
      value: tpl.backCoverBgUrl || '',
      isRoot: false,
    },
  ];

  const mergedPreviewConfig = {
    ...config,
    templateId: 'custom',
    customTemplate: tpl,
  };

  const activeSlotObj = bgSlots.find((s) => s.key === previewPartKey) || bgSlots[0];
  const isTitleInstitutionalMode = previewPartKey === 'titlePageBgUrl';
  const activeInstitutionalMeta =
    INSTITUTIONAL_CATEGORIES.find((c) => c.key === activeInstitutionalKey) ||
    INSTITUTIONAL_CATEGORIES[0];
  const activeInstitutionalSec = institutionalData[activeInstitutionalKey] || {};
  const hasTitleBackground = Boolean((tpl.titlePageBgUrl || '').trim());

  const renderLivePreviewContent = () => {
    const uploadedUrl = (activeSlotObj?.value || '').trim();

    if (isTitleInstitutionalMode && !uploadedUrl) {
      return (
        <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="max-w-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl border border-amber-200 bg-amber-50 mx-auto flex items-center justify-center text-amber-600">
              <ImageIcon size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-700">
                Step 1 · Required First
              </p>
              <p className="text-xs font-bold text-neutral-800">
                Upload Institutional Page Background
              </p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Upload your background image or PDF first. Once uploaded, you can add VMGO, Graduation Programme, Official Messages, photos, and edit directly on this preview.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer transition-colors">
              {uploadingSlot === 'titlePageBgUrl' ? (
                <Loader2 size={12} className="animate-spin text-amber-400" />
              ) : (
                <Upload size={12} className="text-amber-400" />
              )}
              <span>Upload Background First</span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => handleAssetUpload(e, 'titlePageBgUrl', false)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      );
    }

    if (isTitleInstitutionalMode && uploadedUrl) {
      return (
        <YearbookInstitutionalSheet
          sectionKey={activeInstitutionalKey}
          bgUrl={uploadedUrl}
          data={activeInstitutionalSec}
          tpl={tpl}
          config={config}
          editable={isInstitutionalEditable}
          uploadingField={uploadingSlot}
          onUpdateSection={updateInstitutionalSection}
          onUploadPhoto={handleInstitutionalPhotoUpload}
          onTextFocusChange={setIsPreviewTextActive}
        />
      );
    }

    if (!uploadedUrl) {
      return (
        <div className="h-full w-full bg-white flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="max-w-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl border border-neutral-200 bg-neutral-50 mx-auto flex items-center justify-center text-neutral-300">
              <FileText size={22} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-neutral-700">{activeSlotObj.label}</p>
              <p className="text-[11px] text-neutral-400">
                Blank A4 canvas — waiting for PDF, PNG, or JPG upload.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer transition-colors">
              {uploadingSlot === activeSlotObj.key ? (
                <Loader2 size={12} className="animate-spin text-amber-400" />
              ) : (
                <Upload size={12} className="text-amber-400" />
              )}
              <span>Upload Document</span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => handleAssetUpload(e, activeSlotObj.key, activeSlotObj.isRoot)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      );
    }

    if (previewPartKey === 'interiorBgUrl') {
      return (
        <YearbookPageCustom
          pageNumber={1}
          students={students}
          config={mergedPreviewConfig}
        />
      );
    }

    return (
      <div className="h-full w-full bg-white relative overflow-hidden">
        <img
          src={uploadedUrl}
          alt={activeSlotObj.label}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <section className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm overflow-hidden font-body w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#14100c] via-[#1f1710] to-[#11151d] text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30">
              <Sparkles size={15} />
            </span>
            <h2 className="font-heading text-base font-bold tracking-tight">
              Studio Template
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-xl bg-white/10 border border-white/15 p-0.5 gap-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyState.past.length === 0}
              aria-label="Undo (Ctrl+Z)"
              className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${historyState.past.length > 0
                ? 'text-white hover:bg-white/15 hover:text-amber-300 cursor-pointer'
                : 'text-white/30 cursor-not-allowed'
                }`}
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyState.future.length === 0}
              aria-label="Redo (Ctrl+Y)"
              className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${historyState.future.length > 0
                ? 'text-white hover:bg-white/15 hover:text-amber-300 cursor-pointer'
                : 'text-white/30 cursor-not-allowed'
                }`}
            >
              <Redo2 size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => updateTemplate({ showGuides: !tpl.showGuides })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${tpl.showGuides
              ? 'bg-amber-400 text-neutral-950 border-amber-300'
              : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
              }`}
          >
            <Eye size={13} />
            <span>{tpl.showGuides ? 'Guides On' : 'Show Guides'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenPrintPreview}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 text-xs font-bold flex items-center gap-1.5 hover:opacity-95 cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Preview Full A4 Book</span>
          </button>
        </div>
      </div>

      {/* Main Split: Equal-Height Controls Left (4 cols) + Wide Preview Stage (8 cols) */}
      <div className="p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Controls Column */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 min-h-0">
          {activeControlTab === 'backgrounds' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {uploadError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {uploadError}
                </div>
              )}

              {uploadNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {uploadNotice}
                </div>
              )}

              {isTitleInstitutionalMode ? (
                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  {/* Focused Title & Institutional Builder Header */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPartKey('interiorBgUrl')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-950 cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>All Yearbook Parts</span>
                    </button>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-700">
                      Title &amp; Institutional Setup
                    </span>
                  </div>

                  {/* Step 1: Ask First for Background Upload */}
                  <div className="p-3 rounded-2xl border border-amber-300/80 bg-amber-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-neutral-900">
                        Require Background
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                          {uploadingSlot === 'titlePageBgUrl' ? (
                            <Loader2 size={12} className="animate-spin text-amber-400" />
                          ) : (
                            <Upload size={12} className="text-amber-400" />
                          )}
                          <span>{hasTitleBackground ? 'Replace' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            onChange={(e) => handleAssetUpload(e, 'titlePageBgUrl', false)}
                            className="hidden"
                          />
                        </label>
                        {hasTitleBackground && (
                          <button
                            type="button"
                            onClick={() => updateTemplate({ titlePageBgUrl: '' })}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Delete background"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {!hasTitleBackground && (
                      <p className="text-[11px] text-amber-900/80">
                        Upload your background first (PDF, PNG, or JPG) to unlock categories &amp; preview controls.
                      </p>
                    )}
                  </div>

                  {/* Step 2 Active Category Inputs (rendered once background is uploaded) */}
                  {hasTitleBackground && (
                    <div className="flex-1 flex flex-col gap-3 min-h-0">

                      {/* Active Category Inputs (Synced with Editable A4 Preview) */}
                      <div className="flex-1 flex flex-col p-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 gap-2.5 text-xs min-h-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-neutral-900">
                              {activeInstitutionalMeta.label}
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {activeInstitutionalMeta.hint}
                            </p>
                          </div>

                          <label className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-300 hover:border-amber-400 text-neutral-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs">
                            {uploadingSlot === `${activeInstitutionalKey}:pdf` ? (
                              <Loader2 size={12} className="animate-spin text-amber-600" />
                            ) : (
                              <FileText size={12} className="text-amber-600" />
                            )}
                            <span>Upload PDF</span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf,.txt"
                              onChange={(e) =>
                                handleInstitutionalPdfImport(e, activeInstitutionalKey)
                              }
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Editable Institutional Eyebrow & Section Heading */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={
                              activeInstitutionalSec.institutionHeader !== undefined
                                ? activeInstitutionalSec.institutionHeader
                                : [config.institutionName, config.academicYear]
                                  .filter(Boolean)
                                  .join(' · ')
                            }
                            onChange={(e) =>
                              updateInstitutionalSection(activeInstitutionalKey, {
                                institutionHeader: e.target.value,
                              })
                            }
                            placeholder="Institution Header (e.g. School · Year)"
                            className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            value={activeInstitutionalSec.heading ?? activeInstitutionalMeta.label}
                            onChange={(e) =>
                              updateInstitutionalSection(activeInstitutionalKey, {
                                heading: e.target.value,
                              })
                            }
                            placeholder="Section Heading"
                            className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* School Level Toggle for University President / Division Superintendent */}
                        {activeInstitutionalMeta.hasLevelToggle && (
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              {
                                id: 'college',
                                label: 'College · University President',
                                roleTitle: 'University President',
                                heading: 'Message from the University President',
                              },
                              {
                                id: 'highschool',
                                label: 'High School · Division Supt.',
                                roleTitle: 'Schools Division Superintendent',
                                heading: 'Message from the Division Superintendent',
                              },
                            ].map((opt) => {
                              const selected =
                                (activeInstitutionalSec.level || 'college') === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    updateInstitutionalSection(activeInstitutionalKey, {
                                      level: opt.id,
                                      roleTitle: opt.roleTitle,
                                      heading: opt.heading,
                                    })
                                  }
                                  className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border cursor-pointer transition-colors ${selected
                                    ? 'bg-neutral-900 text-amber-300 border-neutral-900'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                                    }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Official Portrait Photo + Name + Office Title */}
                        {activeInstitutionalMeta.hasPerson && (
                          <div className="flex-1 flex flex-col gap-2 min-h-0">
                            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-neutral-200">
                              <div className="w-11 h-14 rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden shrink-0 flex items-center justify-center">
                                {activeInstitutionalSec.photoUrl ? (
                                  <img
                                    src={activeInstitutionalSec.photoUrl}
                                    alt={activeInstitutionalSec.name || activeInstitutionalMeta.shortLabel}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <ImageIcon size={15} className="text-neutral-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-[11px] font-bold text-neutral-800">
                                  Official Portrait Photo
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <label className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer">
                                    {uploadingSlot === `${activeInstitutionalKey}:photo` ? (
                                      <Loader2 size={11} className="animate-spin text-amber-400" />
                                    ) : (
                                      <Upload size={11} className="text-amber-400" />
                                    )}
                                    <span>
                                      {activeInstitutionalSec.photoUrl ? 'Swap Photo' : 'Upload Photo'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf,application/pdf"
                                      onChange={(e) =>
                                        handleInstitutionalPhotoUpload(e, activeInstitutionalKey)
                                      }
                                      className="hidden"
                                    />
                                  </label>
                                  {activeInstitutionalSec.photoUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateInstitutionalSection(activeInstitutionalKey, {
                                          photoUrl: '',
                                        })
                                      }
                                      className="p-1 rounded-lg border border-neutral-200 text-neutral-400 hover:text-rose-600 cursor-pointer"
                                      title="Remove portrait"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={activeInstitutionalSec.name || ''}
                                onChange={(e) =>
                                  updateInstitutionalSection(activeInstitutionalKey, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Official Full Name & Suffix"
                                className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={activeInstitutionalSec.roleTitle || ''}
                                onChange={(e) =>
                                  updateInstitutionalSection(activeInstitutionalKey, {
                                    roleTitle: e.target.value,
                                  })
                                }
                                placeholder="Office / Role Title"
                                className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            <textarea
                              rows={4}
                              value={activeInstitutionalSec.message || ''}
                              onChange={(e) =>
                                updateInstitutionalSection(activeInstitutionalKey, {
                                  message: e.target.value,
                                })
                              }
                              placeholder="Direct paste message here, upload a PDF above, or edit directly on the A4 preview..."
                              className="w-full flex-1 min-h-[120px] px-2.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs leading-relaxed resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        {/* VMGO Inputs */}
                        {activeInstitutionalKey === 'vmgo' && (
                          <div className="flex-1 flex flex-col gap-2 min-h-0">
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-neutral-200 shrink-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden shrink-0 flex items-center justify-center">
                                  {activeInstitutionalSec.topPhotoUrl ? (
                                    <img
                                      src={activeInstitutionalSec.topPhotoUrl}
                                      alt="School Photo"
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon size={14} className="text-neutral-300" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-neutral-800 truncate">
                                    Photo Above School Name
                                  </p>
                                  {activeInstitutionalSec.topPhotoUrl ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateInstitutionalSection('vmgo', {
                                            topPhotoSizePx: Math.max(
                                              32,
                                              Number(activeInstitutionalSec.topPhotoSizePx || 64) - 8
                                            ),
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] font-bold cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="text-[10px] font-mono text-neutral-600">
                                        {Number(activeInstitutionalSec.topPhotoSizePx || 64)}px
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateInstitutionalSection('vmgo', {
                                            topPhotoSizePx: Math.min(
                                              160,
                                              Number(activeInstitutionalSec.topPhotoSizePx || 64) + 8
                                            ),
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-neutral-400 truncate">
                                      Optional seal or photo
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <label className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer">
                                  {uploadingSlot === 'vmgo:topPhotoUrl' ? (
                                    <Loader2 size={11} className="animate-spin text-amber-400" />
                                  ) : (
                                    <Upload size={11} className="text-amber-400" />
                                  )}
                                  <span>{activeInstitutionalSec.topPhotoUrl ? 'Swap' : 'Upload'}</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    onChange={(e) =>
                                      handleInstitutionalPhotoUpload(e, 'vmgo', 'topPhotoUrl')
                                    }
                                    className="hidden"
                                  />
                                </label>
                                {activeInstitutionalSec.topPhotoUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateInstitutionalSection('vmgo', { topPhotoUrl: '' })
                                    }
                                    className="p-1 rounded-lg border border-neutral-200 text-neutral-400 hover:text-rose-600 cursor-pointer"
                                    aria-label="Delete top photo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              value={activeInstitutionalSec.vision || ''}
                              onChange={(e) =>
                                updateInstitutionalSection('vmgo', { vision: e.target.value })
                              }
                              placeholder="Vision — paste text or upload VMGO PDF..."
                              className="w-full flex-1 min-h-[64px] px-2.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs resize-none focus:outline-none focus:border-amber-500"
                            />
                            <textarea
                              rows={2}
                              value={activeInstitutionalSec.mission || ''}
                              onChange={(e) =>
                                updateInstitutionalSection('vmgo', { mission: e.target.value })
                              }
                              placeholder="Mission — paste text or edit directly on the A4 preview..."
                              className="w-full flex-1 min-h-[64px] px-2.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs resize-none focus:outline-none focus:border-amber-500"
                            />
                            <textarea
                              rows={3}
                              value={activeInstitutionalSec.goals || ''}
                              onChange={(e) =>
                                updateInstitutionalSection('vmgo', { goals: e.target.value })
                              }
                              placeholder="Goals & Objectives..."
                              className="w-full flex-1 min-h-[76px] px-2.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}

                        {/* Graduation Programme Inputs */}
                        {activeInstitutionalKey === 'programme' && (
                          <div className="flex-1 flex flex-col gap-2 min-h-0">
                            <input
                              type="text"
                              value={activeInstitutionalSec.subtitle || ''}
                              onChange={(e) =>
                                updateInstitutionalSection('programme', {
                                  subtitle: e.target.value,
                                })
                              }
                              placeholder="Commencement Date, Time & Venue (optional)"
                              className="w-full px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500 shrink-0"
                            />
                            <textarea
                              rows={5}
                              value={activeInstitutionalSec.body || ''}
                              onChange={(e) =>
                                updateInstitutionalSection('programme', { body: e.target.value })
                              }
                              placeholder="Direct paste Graduation Programme order here or upload Programme PDF above..."
                              className="w-full flex-1 min-h-[160px] px-2.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs leading-relaxed resize-none focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Canva PDF / Image guide */}
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
                    <p className="font-bold text-amber-950 flex items-center gap-1.5">
                      <FileText size={13} className="text-amber-700" />
                      <span>Accepts A4 PDF, PNG, or JPG</span>
                    </p>
                    <p className="text-[11px] text-amber-900/85 leading-relaxed">
                      Upload any exported <strong>PDF</strong> or <strong>PNG/JPG</strong> into the yearbook parts below. PDFs render automatically at print resolution onto each sheet.
                    </p>
                  </div>

                  {/* All Yearbook Parts Upload List */}
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {bgSlots.map((slot) => {
                      const isPreviewing = previewPartKey === slot.key;
                      return (
                        <div
                          key={slot.key}
                          onClick={() => setPreviewPartKey(slot.key)}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${isPreviewing
                            ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300/60'
                            : 'border-neutral-200 bg-neutral-50/60 hover:border-neutral-300'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-13 rounded-lg border border-neutral-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                              {slot.value ? (
                                <img src={slot.value} alt={slot.label} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={15} className="text-neutral-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">{slot.label}</p>
                              <p className="text-[11px] text-neutral-500 line-clamp-1">{slot.hint}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <label className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                              {uploadingSlot === slot.key ? (
                                <Loader2 size={12} className="animate-spin text-amber-400" />
                              ) : (
                                <Upload size={12} className="text-amber-400" />
                              )}
                              <span>{slot.value ? 'Swap' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={(e) => handleAssetUpload(e, slot.key, slot.isRoot)}
                                className="hidden"
                              />
                            </label>
                            {slot.value && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (slot.isRoot) {
                                    commitTrackedConfig(
                                      { ...(configRef.current || {}), templateId: 'custom', [slot.key]: '' },
                                      { coalesce: false }
                                    );
                                  } else {
                                    updateTemplate({ [slot.key]: '' }, { coalesce: false });
                                  }
                                }}
                                className="p-1.5 rounded-xl border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Clear background"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeControlTab === 'layout' && (
            <div className="flex-1 flex flex-col justify-start gap-3 text-xs min-h-0">
              <div className="flex items-center justify-start gap-2 pb-1.5 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => setActiveControlTab('backgrounds')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-950 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Setup</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <StudioRangeCard
                  label="Top Safe Margin"
                  valueLabel={`${tpl.paddingTop}px`}
                  value={tpl.paddingTop}
                  min={16}
                  max={140}
                  onChange={(val) => updateTemplate({ paddingTop: val })}
                />
                <StudioRangeCard
                  label="Bottom Margin"
                  valueLabel={`${tpl.paddingBottom}px`}
                  value={tpl.paddingBottom}
                  min={16}
                  max={120}
                  onChange={(val) => updateTemplate({ paddingBottom: val })}
                />
                <StudioRangeCard
                  label="Side Margins"
                  valueLabel={`${tpl.paddingX}px`}
                  value={tpl.paddingX}
                  min={12}
                  max={72}
                  onChange={(val) => updateTemplate({ paddingX: val })}
                />
                <StudioRangeCard
                  label="Grid Spacing"
                  valueLabel={`${tpl.gridGap}px`}
                  value={tpl.gridGap}
                  min={6}
                  max={28}
                  onChange={(val) => updateTemplate({ gridGap: val })}
                />
                <StudioRangeCard
                  label="Portrait Size"
                  valueLabel={`${tpl.photoSizePct}%`}
                  value={tpl.photoSizePct}
                  min={55}
                  max={100}
                  onChange={(val) => updateTemplate({ photoSizePct: val })}
                />
                <StudioRangeCard
                  label="Readability Scrim"
                  valueLabel={`${tpl.bgScrimOpacity}%`}
                  value={tpl.bgScrimOpacity}
                  min={0}
                  max={85}
                  onChange={(val) => updateTemplate({ bgScrimOpacity: val })}
                />
                <div className="col-span-2">
                  <StudioRangeCard
                    label="Card Corners"
                    valueLabel={`${tpl.cardRadius}px`}
                    value={tpl.cardRadius}
                    min={0}
                    max={28}
                    onChange={(val) => updateTemplate({ cardRadius: val })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeControlTab === 'typography' && (
            <div className="flex-1 flex flex-col justify-between gap-3 text-xs min-h-0">
              <div className="space-y-3">
                <div className="flex items-center justify-start gap-2 pb-1.5 border-b border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setActiveControlTab('backgrounds')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-950 cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Setup</span>
                  </button>
                </div>

                {/* Modernized Card Backdrop Style + Movable Position */}
                <div className="p-3 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-mono uppercase tracking-wider font-bold text-neutral-500">
                      Card Backdrop Style
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <Move size={10} />
                      <span>Movable</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/70">
                    {[
                      { id: 'glass-light', label: 'Frosted Light', dot: 'bg-white border border-neutral-300' },
                      { id: 'glass-dark', label: 'Frosted Dark', dot: 'bg-neutral-900 border border-neutral-700' },
                      { id: 'bordered', label: 'Outline Only', dot: 'bg-transparent border-2 border-amber-500' },
                      { id: 'transparent', label: 'Raw Over Art', dot: 'bg-transparent border border-dashed border-neutral-400' },
                    ].map((s) => {
                      const activeCard = tpl.cardStyle === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => updateTemplate({ cardStyle: s.id })}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${activeCard
                            ? 'bg-neutral-900 text-amber-300 shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/70'
                            }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Movable Card Backdrop X / Y Position Controls */}
                  <div className="pt-2 border-t border-neutral-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold text-neutral-600">
                        Backdrop Position (or drag card on sheet)
                      </span>
                      {(Number(tpl.cardOffsetX || 0) !== 0 || Number(tpl.cardOffsetY || 0) !== 0) && (
                        <button
                          type="button"
                          onClick={() => updateTemplate({ cardOffsetX: 0, cardOffsetY: 0 })}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          <RotateCcw size={10} />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <StudioRangeCard
                        label="Horizontal (X)"
                        valueLabel={`${Number(tpl.cardOffsetX || 0)}px`}
                        value={Number(tpl.cardOffsetX || 0)}
                        min={-90}
                        max={90}
                        onChange={(val) => updateTemplate({ cardOffsetX: val })}
                      />
                      <StudioRangeCard
                        label="Vertical (Y)"
                        valueLabel={`${Number(tpl.cardOffsetY || 0)}px`}
                        value={Number(tpl.cardOffsetY || 0)}
                        min={-90}
                        max={90}
                        onChange={(val) => updateTemplate({ cardOffsetY: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <StudioRangeCard
                    label="Card Opacity"
                    valueLabel={`${tpl.cardBgOpacity}%`}
                    value={tpl.cardBgOpacity}
                    min={0}
                    max={100}
                    onChange={(val) => updateTemplate({ cardBgOpacity: val })}
                  />
                  <StudioRangeCard
                    label="Text Scale"
                    valueLabel={`${Number(tpl.fontScale || 1).toFixed(2)}×`}
                    value={tpl.fontScale || 1}
                    min={0.85}
                    max={1.2}
                    step={0.05}
                    onChange={(val) => updateTemplate({ fontScale: val })}
                  />
                </div>
              </div>

              {/* Modernized Theme Palette Swatches */}
              <div className="p-3 rounded-2xl border border-neutral-200/90 bg-white shadow-2xs space-y-2">
                <span className="block text-[10.5px] font-mono uppercase tracking-wider font-bold text-neutral-500">
                  Theme Colors
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'headerColor', label: 'Header Text' },
                    { key: 'textColor', label: 'Name Color' },
                    { key: 'mutedTextColor', label: 'Quote Color' },
                    { key: 'accentColor', label: 'Gold Accent' },
                  ].map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 hover:bg-white hover:border-amber-300 cursor-pointer transition-colors"
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/15 shadow-xs shrink-0 overflow-hidden relative"
                        style={{ backgroundColor: tpl[c.key] || '#171717' }}
                      >
                        <input
                          type="color"
                          value={tpl[c.key] || '#171717'}
                          onChange={(e) => updateTemplate({ [c.key]: e.target.value })}
                          className="opacity-0 inset-0 w-full h-full cursor-pointer absolute"
                        />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[10.5px] font-bold text-neutral-800 truncate">
                          {c.label}
                        </span>
                        <span className="block text-[10px] font-mono text-neutral-500 uppercase">
                          {tpl[c.key]}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Proceed to Next Process + Compact Collapsible Save Preset */}
          {(() => {
            const catIdx = INSTITUTIONAL_CATEGORIES.findIndex(
              (c) => c.key === activeInstitutionalKey
            );
            const partIdx = bgSlots.findIndex((s) => s.key === previewPartKey);
            let nextLabel = 'Preview Full Book';
            let onProceed = () => onOpenPrintPreview?.();

            if (isTitleInstitutionalMode && hasTitleBackground) {
              if (catIdx >= 0 && catIdx < INSTITUTIONAL_CATEGORIES.length - 1) {
                const nextCat = INSTITUTIONAL_CATEGORIES[catIdx + 1];
                nextLabel = `Next: ${nextCat.shortLabel}`;
                onProceed = () => {
                  setActiveControlTab('backgrounds');
                  setActiveInstitutionalKey(nextCat.key);
                  setIsPreviewTextActive(false);
                };
              } else {
                nextLabel = 'Next: Message';
                onProceed = () => {
                  setActiveControlTab('backgrounds');
                  setPreviewPartKey('dedicationBgUrl');
                  setIsPreviewTextActive(false);
                };
              }
            } else if (partIdx >= 0 && partIdx < bgSlots.length - 1) {
              const nextPart = bgSlots[partIdx + 1];
              nextLabel = `Next: ${nextPart.shortLabel}`;
              onProceed = () => {
                setActiveControlTab('backgrounds');
                setPreviewPartKey(nextPart.key);
                setIsPreviewTextActive(false);
              };
            }

            const proceedDisabled = isTitleInstitutionalMode && !hasTitleBackground;

            return (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={proceedDisabled}
                    onClick={onProceed}
                    className={`flex-1 px-3.5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all ${proceedDisabled
                      ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 shadow-xs cursor-pointer'
                      }`}
                  >
                    <span>{nextLabel}</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPresetsDrawer((v) => !v)}
                    className={`px-3 py-2.5 rounded-2xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${showPresetsDrawer
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-700'
                      }`}
                    title="Save or load reusable presets"
                  >
                    <Save size={13} className="text-amber-600" />
                    <span>{presets.length > 0 ? `Presets (${presets.length})` : 'Preset'}</span>
                  </button>
                </div>

                {showPresetsDrawer && (
                  <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        data-local-input="true"
                        value={presetNameInput}
                        onChange={(e) => setPresetNameInput(e.target.value)}
                        placeholder="Name this setup (e.g. SHS Gold 2026)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onSavePreset?.(
                            presetNameInput || tpl.presetName || 'Custom Canva Preset'
                          );
                          setPresetNameInput('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Save size={12} className="text-amber-400" />
                        <span>Save</span>
                      </button>
                    </div>

                    {presets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {presets.map((preset) => (
                          <div
                            key={preset.id}
                            className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white pl-2.5 pr-1 py-1 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => onApplyPreset?.(preset)}
                              className="font-semibold text-neutral-800 hover:text-amber-700 cursor-pointer flex items-center gap-1"
                            >
                              <Check size={12} className="text-amber-600" />
                              <span>{preset.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePreset?.(preset.id)}
                              className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                              title="Delete preset"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Wide & Tall Live A4 Preview Stage (8 cols — hosts centered A4 sheet + floating left/right docks) */}
        <div
          ref={previewStageRef}
          onBlur={(e) => {
            if (!previewStageRef.current?.contains(e.relatedTarget)) {
              setIsPreviewTextActive(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsPreviewTextActive(false);
          }}
          className="lg:col-span-8 flex flex-col justify-between gap-3 min-h-0"
        >
          {/* Preview Box with Floating Left Categories, Centered A4 Sheet, Floating Right Controls & Pop-up Typography Bar */}
          <div className="relative w-full flex-1 rounded-2xl bg-neutral-100/70 border border-neutral-200/80 p-3 sm:p-4 flex flex-col justify-center">
            {isTitleInstitutionalMode &&
              hasTitleBackground &&
              isInstitutionalEditable &&
              isPreviewTextActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-300/80 shadow-xl text-[11px] max-w-[95%]">
                  <select
                    value={activeInstitutionalSec.fontFamily || 'serif'}
                    onChange={(e) =>
                      updateInstitutionalSection(activeInstitutionalKey, {
                        fontFamily: e.target.value,
                      })
                    }
                    className="px-2 py-1 rounded-xl border border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-800 cursor-pointer focus:outline-none focus:border-amber-400"
                    title="Font Family"
                  >
                    {INSTITUTIONAL_FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-50 px-1 py-0.5 gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const cur = Number(activeInstitutionalSec.fontSizePx || 10.5);
                        updateInstitutionalSection(activeInstitutionalKey, {
                          fontSizePx: Math.max(8, Math.round((cur - 0.5) * 10) / 10),
                        });
                      }}
                      className="p-1 rounded-lg hover:bg-white text-neutral-700 cursor-pointer"
                      title="Decrease Font Size"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-[10.5px] font-mono font-bold text-neutral-700 min-w-[36px] text-center">
                      {Number(activeInstitutionalSec.fontSizePx || 10.5)}px
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const cur = Number(activeInstitutionalSec.fontSizePx || 10.5);
                        updateInstitutionalSection(activeInstitutionalKey, {
                          fontSizePx: Math.min(18, Math.round((cur + 0.5) * 10) / 10),
                        });
                      }}
                      className="p-1 rounded-lg hover:bg-white text-neutral-700 cursor-pointer"
                      title="Increase Font Size"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-50 p-0.5 gap-0.5">
                    {[
                      { id: 'left', Icon: AlignLeft, label: 'Align Left' },
                      { id: 'center', Icon: AlignCenter, label: 'Align Center' },
                      { id: 'right', Icon: AlignRight, label: 'Align Right' },
                      { id: 'justify', Icon: AlignJustify, label: 'Justify Text' },
                    ].map((al) => {
                      const AlignIcon = al.Icon;
                      const currentAlign =
                        activeInstitutionalSec.textAlign ||
                        (activeInstitutionalMeta.kind === 'message' ? 'justify' : 'left');
                      const isActiveAlign = currentAlign === al.id;
                      return (
                        <button
                          key={al.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            updateInstitutionalSection(activeInstitutionalKey, {
                              textAlign: al.id,
                            })
                          }
                          title={al.label}
                          className={`p-1 rounded-lg cursor-pointer transition-colors ${isActiveAlign
                            ? 'bg-neutral-900 text-amber-300'
                            : 'text-neutral-600 hover:bg-white hover:text-neutral-950'
                            }`}
                        >
                          <AlignIcon size={12} />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsPreviewTextActive(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer"
                    title="Hide typography bar"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Left Floating Space Inside Preview: Numbered Institutional Categories (locked until Step 1 Background uploaded) */}
              {isTitleInstitutionalMode && (
                <div className="shrink-0 rounded-2xl bg-white/85 backdrop-blur-xl border border-white ring-1 ring-neutral-200/80 shadow-md p-2 space-y-1.5 self-center z-20">
                  {!hasTitleBackground && (
                    <div className="flex justify-center pb-0.5 text-amber-600">
                      <Lock size={12} />
                    </div>
                  )}
                  <div className="flex flex-wrap sm:flex-col items-center justify-center gap-1.5">
                    {INSTITUTIONAL_CATEGORIES.map((cat, idx) => {
                      const active = activeInstitutionalKey === cat.key;
                      const populated = isInstitutionalSectionPopulated(
                        cat.key,
                        institutionalData[cat.key]
                      );
                      return (
                        <div
                          key={cat.key}
                          className="relative"
                          onMouseEnter={() => setHoveredLeftCat(cat.key)}
                          onMouseLeave={() => setHoveredLeftCat('')}
                        >
                          <button
                            type="button"
                            disabled={!hasTitleBackground}
                            onClick={() => {
                              setActiveInstitutionalKey(cat.key);
                              setIsPreviewTextActive(false);
                            }}
                            aria-label={`${idx + 1}. ${cat.label}`}
                            className={`w-10 h-10 rounded-xl font-mono text-xs font-extrabold inline-flex items-center justify-center border transition-all relative ${!hasTitleBackground
                              ? 'bg-neutral-100/80 text-neutral-400 border-neutral-200/80 opacity-50 cursor-not-allowed'
                              : active
                                ? 'bg-neutral-900 text-amber-300 border-neutral-900 shadow-xs cursor-pointer scale-[1.04]'
                                : 'bg-white/95 text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:text-neutral-950 cursor-pointer'
                              }`}
                          >
                            <span>{idx + 1}</span>
                            {populated && (
                              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-white" />
                            )}
                          </button>

                          {hoveredLeftCat === cat.key && (
                            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                              <p className="text-[11px] font-bold text-amber-300 leading-tight">
                                {idx + 1} · {cat.shortLabel}
                              </p>
                              <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                                {!hasTitleBackground ? 'Upload Require Background first to unlock' : cat.hint}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Center A4 Sheet */}
              <div className="flex-1 min-w-0 flex items-center justify-center">
                <div className="w-full max-w-[min(460px,calc((100dvh-255px)*210/297))] aspect-[210/297] rounded-xl overflow-hidden border border-neutral-300 shadow-xl bg-white">
                  {renderLivePreviewContent()}
                </div>
              </div>

              {/* Right Floating Space Inside Preview: Icon-Only Controls + Spacing/Grid & Text/Cards (purpose tooltip on hover) */}
              <div className="shrink-0 rounded-2xl bg-white/85 backdrop-blur-xl border border-white ring-1 ring-neutral-200/80 shadow-md p-2 self-center z-30">
                <div className="flex flex-wrap sm:flex-col items-center justify-center gap-2">
                  {isTitleInstitutionalMode && (
                    <>
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredRightTool('edit')}
                        onMouseLeave={() => setHoveredRightTool('')}
                      >
                        <button
                          type="button"
                          disabled={!hasTitleBackground}
                          onClick={() => setIsInstitutionalEditable((v) => !v)}
                          aria-label={isInstitutionalEditable ? 'Editable Preview' : 'Clean View'}
                          className={`w-11 h-11 rounded-xl inline-flex items-center justify-center border transition-colors ${!hasTitleBackground
                            ? 'bg-neutral-100/80 text-neutral-400 border-neutral-200/80 opacity-50 cursor-not-allowed'
                            : isInstitutionalEditable
                              ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-xs cursor-pointer'
                              : 'bg-white/95 text-neutral-700 border-neutral-200 hover:border-neutral-400 cursor-pointer'
                            }`}
                        >
                          {isInstitutionalEditable ? <Pencil size={18} /> : <Eye size={18} />}
                        </button>
                        {hoveredRightTool === 'edit' && (
                          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                            <p className="text-[11px] font-bold text-amber-300 leading-tight">
                              {isInstitutionalEditable ? 'Editable Preview' : 'Clean View'}
                            </p>
                            <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                              {isInstitutionalEditable
                                ? 'Click any text or portrait directly on the sheet to edit'
                                : 'Preview final sheet without editing outlines'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredRightTool('bg')}
                        onMouseLeave={() => setHoveredRightTool('')}
                      >
                        <label
                          aria-label="Replace Background"
                          className="w-11 h-11 rounded-xl bg-white/95 border border-neutral-200 hover:border-amber-400 text-amber-700 inline-flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Upload size={18} />
                          <input
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            onChange={(e) => handleAssetUpload(e, 'titlePageBgUrl', false)}
                            className="hidden"
                          />
                        </label>
                        {hoveredRightTool === 'bg' && (
                          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                            <p className="text-[11px] font-bold text-amber-300 leading-tight">
                              Replace Background
                            </p>
                            <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                              Upload or swap the A4 background image or PDF
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredRightTool('pdf')}
                        onMouseLeave={() => setHoveredRightTool('')}
                      >
                        <label
                          aria-label="Import PDF Text"
                          className={`w-11 h-11 rounded-xl border inline-flex items-center justify-center transition-colors ${!hasTitleBackground
                            ? 'bg-neutral-100/80 text-neutral-400 border-neutral-200/80 opacity-50 pointer-events-none cursor-not-allowed'
                            : 'bg-white/95 border-neutral-200 hover:border-amber-400 text-amber-700 cursor-pointer'
                            }`}
                        >
                          {uploadingSlot === `${activeInstitutionalKey}:pdf` ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <FileText size={18} />
                          )}
                          <input
                            type="file"
                            disabled={!hasTitleBackground}
                            accept=".pdf,application/pdf,.txt"
                            onChange={(e) => handleInstitutionalPdfImport(e, activeInstitutionalKey)}
                            className="hidden"
                          />
                        </label>
                        {hoveredRightTool === 'pdf' && (
                          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                            <p className="text-[11px] font-bold text-amber-300 leading-tight">
                              Import PDF
                            </p>
                            <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                              Extract text from a PDF file directly onto this sheet
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredRightTool('text')}
                        onMouseLeave={() => setHoveredRightTool('')}
                      >
                        <button
                          type="button"
                          disabled={!hasTitleBackground}
                          onClick={() => handleAddTextBlock(activeInstitutionalKey)}
                          aria-label="Add Text"
                          className={`w-11 h-11 rounded-xl border inline-flex items-center justify-center transition-colors ${!hasTitleBackground
                            ? 'bg-neutral-100/80 text-neutral-400 border-neutral-200/80 opacity-50 cursor-not-allowed'
                            : 'bg-white/95 border-neutral-200 hover:border-amber-400 text-amber-700 cursor-pointer'
                            }`}
                        >
                          <Type size={18} />
                        </button>
                        {hoveredRightTool === 'text' && (
                          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                            <p className="text-[11px] font-bold text-amber-300 leading-tight">
                              + Add Text
                            </p>
                            <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                              Insert a draggable custom text box or signatory
                            </p>
                          </div>
                        )}
                      </div>

                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredRightTool('image')}
                        onMouseLeave={() => setHoveredRightTool('')}
                      >
                        <label
                          aria-label="Add Image"
                          className={`w-11 h-11 rounded-xl border inline-flex items-center justify-center transition-colors ${!hasTitleBackground
                            ? 'bg-neutral-100/80 text-neutral-400 border-neutral-200/80 opacity-50 pointer-events-none cursor-not-allowed'
                            : 'bg-white/95 border-neutral-200 hover:border-amber-400 text-amber-700 cursor-pointer'
                            }`}
                        >
                          {uploadingSlot === `${activeInstitutionalKey}:extraImg` ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <ImageIcon size={18} />
                          )}
                          <input
                            type="file"
                            disabled={!hasTitleBackground}
                            accept="image/*,.pdf,application/pdf"
                            onChange={(e) => handleAddImageBlock(e, activeInstitutionalKey)}
                            className="hidden"
                          />
                        </label>
                        {hoveredRightTool === 'image' && (
                          <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                            <p className="text-[11px] font-bold text-amber-300 leading-tight">
                              + Add Image
                            </p>
                            <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                              Insert a school seal, signature, or photo overlay
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="hidden sm:block w-6 h-px bg-neutral-200/90 my-0.5" />
                    </>
                  )}

                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredRightTool('layout')}
                    onMouseLeave={() => setHoveredRightTool('')}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveControlTab((t) => (t === 'layout' ? 'backgrounds' : 'layout'))
                      }
                      aria-label="Spacing & Grid"
                      className={`w-11 h-11 rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer ${activeControlTab === 'layout'
                        ? 'bg-neutral-900 text-amber-300 border-neutral-900 shadow-xs'
                        : 'bg-white/95 border-neutral-200 hover:border-amber-400 text-neutral-700'
                        }`}
                    >
                      <Layers size={18} />
                    </button>
                    {hoveredRightTool === 'layout' && (
                      <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                        <p className="text-[11px] font-bold text-amber-300 leading-tight">
                          Spacing &amp; Grid
                        </p>
                        <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                          Adjust page margins, grid spacing &amp; background scrim
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredRightTool('typography')}
                    onMouseLeave={() => setHoveredRightTool('')}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveControlTab((t) =>
                          t === 'typography' ? 'backgrounds' : 'typography'
                        )
                      }
                      aria-label="Text & Cards"
                      className={`w-11 h-11 rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer ${activeControlTab === 'typography'
                        ? 'bg-neutral-900 text-amber-300 border-neutral-900 shadow-xs'
                        : 'bg-white/95 border-neutral-200 hover:border-amber-400 text-neutral-700'
                        }`}
                    >
                      <Sliders size={18} />
                    </button>
                    {hoveredRightTool === 'typography' && (
                      <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2.5 w-48 px-3 py-2 rounded-xl bg-neutral-900 text-white shadow-xl border border-white/10 z-50 text-left">
                        <p className="text-[11px] font-bold text-amber-300 leading-tight">
                          Text &amp; Cards
                        </p>
                        <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                          Customize card style, text scale &amp; theme colors
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Centered Part Switcher Strip */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100/80 border border-neutral-200/80">
            {bgSlots.map((part) => {
              const active = previewPartKey === part.key;
              return (
                <button
                  key={part.key}
                  type="button"
                  onClick={() => {
                    setPreviewPartKey(part.key);
                    setIsPreviewTextActive(false);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${active
                    ? 'bg-neutral-900 text-amber-300 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/80'
                    }`}
                >
                  {part.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

YearbookCustomTemplateStudio.propTypes = {
  config: PropTypes.object,
  students: PropTypes.array,
  onUpdateConfig: PropTypes.func,
  presets: PropTypes.array,
  onSavePreset: PropTypes.func,
  onApplyPreset: PropTypes.func,
  onDeletePreset: PropTypes.func,
  onSwitchToCustomTheme: PropTypes.func,
  onOpenPrintPreview: PropTypes.func,
};
