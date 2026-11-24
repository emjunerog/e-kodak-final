import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Camera,
  Upload,
  Trash2,
  Move,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  INSTITUTIONAL_CATEGORIES,
  INSTITUTIONAL_FONT_OPTIONS,
} from '../../../services/yearbookService';

/**
 * YearbookInstitutionalSheet
 * ==========================
 * Renders an A4 sheet over the admin's uploaded Institutional Background
 * (`titlePageBgUrl`) for VMGO, Graduation Programme, and Official Messages
 * (Governor, Mayor, University President / Division Superintendent,
 * Office of the Campus Director, Dean of Instruction).
 *
 * When `editable={true}`, the admin can click/edit headings, names, titles,
 * VMGO paragraphs, programme entries, and messages inline, replace photos directly
 * on the sheet, import PDF text, and drag/resize/edit custom added text or image
 * blocks right over the background artwork.
 */
export default function YearbookInstitutionalSheet({
  sectionKey = 'vmgo',
  bgUrl = '',
  data = {},
  tpl = {},
  config = {},
  editable = false,
  uploadingField = '',
  onUpdateSection,
  onUploadPhoto,
  onTextFocusChange,
}) {
  const sheetRef = useRef(null);
  const cardElsRef = useRef({});
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const [draggingCardKey, setDraggingCardKey] = useState(null);
  const [alignGuides, setAlignGuides] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const textFocusBind = editable
    ? {
        onFocus: () => onTextFocusChange?.(true),
        onClick: () => onTextFocusChange?.(true),
      }
    : {};

  const meta =
    INSTITUTIONAL_CATEGORIES.find((c) => c.key === sectionKey) || INSTITUTIONAL_CATEGORIES[0];

  const scrimOpacity = Number(tpl.bgScrimOpacity ?? 10);
  const headerColor = tpl.headerColor || '#171717';
  const textColor = tpl.textColor || '#171717';
  const mutedTextColor = tpl.mutedTextColor || '#525252';
  const accentColor = tpl.accentColor || '#b47b2b';
  const padTop = Math.min(72, Math.max(18, Number(tpl.paddingTop ?? 42)));
  const padBottom = Math.min(60, Math.max(18, Number(tpl.paddingBottom ?? 28)));
  const padX = Math.min(56, Math.max(18, Number(tpl.paddingX ?? 28)));

  const fontSpec =
    INSTITUTIONAL_FONT_OPTIONS.find((f) => f.id === (data.fontFamily || 'serif')) ||
    INSTITUTIONAL_FONT_OPTIONS[0];
  const activeFontFamily = fontSpec.family;
  const baseFontPx = Math.min(18, Math.max(8, Number(data.fontSizePx || 10.5))) * Number(tpl.fontScale || 1);
  const eyebrowFontPx = Math.max(7.5, Math.round(baseFontPx * 0.8 * 10) / 10);
  const headingFontPx = Math.max(11, Math.round(baseFontPx * 1.32 * 10) / 10);
  const bodyAlign = data.textAlign || (meta.kind === 'message' ? 'justify' : 'left');
  const headerAlign = bodyAlign === 'justify' ? 'center' : bodyAlign;

  const defaultInstitutionHeader = [config.institutionName, config.academicYear]
    .filter(Boolean)
    .join(' · ');
  const institutionHeaderValue =
    data.institutionHeader !== undefined
      ? data.institutionHeader
      : defaultInstitutionHeader;

  const extraBlocks = Array.isArray(data.extraBlocks) ? data.extraBlocks : [];

  const updateField = (patch) => {
    onUpdateSection?.(sectionKey, patch);
  };

  const updateExtraBlock = (blockId, patch) => {
    const nextBlocks = extraBlocks.map((blk) =>
      blk.id === blockId ? { ...blk, ...patch } : blk
    );
    updateField({ extraBlocks: nextBlocks });
  };

  const removeExtraBlock = (blockId) => {
    updateField({
      extraBlocks: extraBlocks.filter((blk) => blk.id !== blockId),
    });
  };

  const handlePointerStart = (e, block) => {
    if (!editable || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = sheetRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setDraggingBlockId(block.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const origXPct = Number(block.xPct ?? 50);
    const origYPct = Number(block.yPct ?? 78);

    const onMove = (moveEvent) => {
      const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;
      const clampedX = Math.min(92, Math.max(8, Math.round((origXPct + dxPct) * 10) / 10));
      const clampedY = Math.min(94, Math.max(6, Math.round((origYPct + dyPct) * 10) / 10));
      updateExtraBlock(block.id, { xPct: clampedX, yPct: clampedY });
    };

    const onUp = () => {
      setDraggingBlockId(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleResizeStart = (e, block) => {
    if (!editable || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedImageId(block.id);
    const startX = e.clientX;
    const origWidth = Number(block.widthPx ?? 88);

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const nextWidth = Math.min(400, Math.max(28, Math.round(origWidth + dx)));
      updateExtraBlock(block.id, { widthPx: nextWidth });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderSurfaceCardClass = () => {
    const style = tpl.cardStyle || 'glass-light';
    if (style === 'transparent') return 'bg-transparent border-transparent';
    if (style === 'bordered') return 'bg-white/20 border border-neutral-400/40';
    if (style === 'glass-dark') return 'bg-neutral-950/75 border border-white/15 text-white';
    return 'bg-white/85 backdrop-blur-xs border border-neutral-200/75 shadow-2xs';
  };

  const surfaceCls = renderSurfaceCardClass();
  const isDarkCard = (tpl.cardStyle || 'glass-light') === 'glass-dark';
  const effectiveTextColor = isDarkCard ? '#f5f5f5' : textColor;
  const effectiveMutedColor = isDarkCard ? '#d4d4d4' : mutedTextColor;
  const cardOffsets = data.cardOffsets || {};
  const globalCardOffsetX = Number(tpl.cardOffsetX || 0);
  const globalCardOffsetY = Number(tpl.cardOffsetY || 0);
  const cardAlpha = Math.min(98, Math.max(0, Number(tpl.cardBgOpacity ?? 88))) / 100;
  const cardRadiusPx = `${Number(tpl.cardRadius ?? 12)}px`;

  const getCardContainerStyle = (cardKey) => {
    const localOff = cardOffsets[cardKey] || { x: 0, y: 0 };
    const tx = Math.round(globalCardOffsetX + Number(localOff.x || 0));
    const ty = Math.round(globalCardOffsetY + Number(localOff.y || 0));
    const style = tpl.cardStyle || 'glass-light';
    let bgStyle = {};
    if (style === 'transparent') {
      bgStyle = { backgroundColor: 'transparent', borderColor: 'transparent' };
    } else if (style === 'glass-dark') {
      bgStyle = { backgroundColor: `rgba(17, 17, 20, ${cardAlpha})` };
    } else if (style === 'bordered') {
      bgStyle = {
        backgroundColor: `rgba(255, 255, 255, ${Math.min(0.6, cardAlpha * 0.55)})`,
        borderColor: `${accentColor}75`,
      };
    } else {
      bgStyle = { backgroundColor: `rgba(255, 255, 255, ${cardAlpha})` };
    }
    return {
      ...bgStyle,
      borderRadius: cardRadiusPx,
      ...(tx !== 0 || ty !== 0 ? { transform: `translate(${tx}px, ${ty}px)` } : {}),
    };
  };

  const handleCardDragStart = (e, cardKey) => {
    if (!editable || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const prev = cardOffsets[cardKey] || { x: 0, y: 0 };
    const origX = Number(prev.x || 0);
    const origY = Number(prev.y || 0);

    const sheetRect = sheetRef.current.getBoundingClientRect();
    const cardEl = cardElsRef.current[cardKey];
    const cardRect = cardEl?.getBoundingClientRect();

    // Compute resting (zero-local-offset) bounds relative to the A4 sheet margins
    const restLeft = cardRect ? cardRect.left - sheetRect.left - origX : padX;
    const restRight = cardRect ? cardRect.right - sheetRect.left - origX : sheetRect.width - padX;
    const restTop = cardRect ? cardRect.top - sheetRect.top - origY : padTop;
    const restBottom = cardRect ? cardRect.bottom - sheetRect.top - origY : sheetRect.height - padBottom;

    // Horizontal allowance: keep cards inside safe edge padding and snap strongly to margins & sibling cards
    const outerPadX = Math.max(8, Math.round(padX * 0.35));
    const minX = cardRect
      ? Math.min(0, Math.round(outerPadX - restLeft))
      : -36;
    const maxX = cardRect
      ? Math.max(0, Math.round(sheetRect.width - outerPadX - restRight))
      : 36;

    // Vertical allowance: respect top & bottom sheet margins strictly
    const minY = cardRect
      ? Math.min(0, Math.round(padTop - restTop))
      : -120;
    const maxY = cardRect
      ? Math.max(0, Math.round(sheetRect.height - padBottom - restBottom))
      : 120;

    // Sibling card X positions to snap against so stacked cards stay aligned to each other
    const siblingKeys =
      meta.kind === 'vmgo'
        ? ['vision', 'mission', 'goals'].filter((k) => k !== cardKey)
        : [];
    const siblingXs = siblingKeys
      .map((k) => Number(cardOffsets[k]?.x || 0))
      .filter((sx) => sx !== 0);

    setDraggingCardKey(cardKey);
    setAlignGuides({
      marginAligned: origX === 0,
      topMarginHit: Math.abs(origY - minY) <= 2,
      bottomMarginHit: Math.abs(origY - maxY) <= 2,
      siblingGuideX: null,
    });

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let rawX = Math.min(maxX, Math.max(minX, Math.round(origX + dx)));
      let rawY = Math.min(maxY, Math.max(minY, Math.round(origY + dy)));

      // Magnetic snapping to page margins (x = 0) and sibling card alignment
      let marginAligned = false;
      let siblingGuideX = null;

      if (Math.abs(rawX) <= 12) {
        rawX = 0;
        marginAligned = true;
      } else {
        for (const sx of siblingXs) {
          if (Math.abs(rawX - sx) <= 10) {
            rawX = sx;
            siblingGuideX = Math.round(restLeft + globalCardOffsetX + sx);
            break;
          }
        }
      }

      // Snap cleanly back to equilibrium vertical position near 0
      if (Math.abs(rawY) <= 8) {
        rawY = 0;
      }

      const topMarginHit = Math.abs(rawY - minY) <= 2;
      const bottomMarginHit = Math.abs(rawY - maxY) <= 2;

      setAlignGuides({
        marginAligned,
        topMarginHit,
        bottomMarginHit,
        siblingGuideX,
      });

      updateField({
        cardOffsets: {
          ...cardOffsets,
          [cardKey]: { x: rawX, y: rawY },
        },
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDraggingCardKey(null);
      setAlignGuides(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resetCardOffset = (cardKey) => {
    const next = { ...cardOffsets };
    delete next[cardKey];
    updateField({ cardOffsets: next });
  };

  const handleCardSurfacePointerDown = (e, cardKey) => {
    if (!editable) return;
    if (e.target.closest('input, textarea, button, label, select, a')) return;
    handleCardDragStart(e, cardKey);
  };

  const renderCardDragPill = (cardKey) => {
    if (!editable) return null;
    const local = cardOffsets[cardKey];
    const hasLocalOffset = local && (Number(local.x || 0) !== 0 || Number(local.y || 0) !== 0);
    return (
      <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-75 group-hover/card:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={(e) => handleCardDragStart(e, cardKey)}
          className="p-1 rounded-md bg-neutral-900/90 text-amber-300 hover:bg-neutral-800 cursor-grab active:cursor-grabbing shadow-xs inline-flex items-center justify-center"
          aria-label="Drag card backdrop"
        >
          <Move size={11} />
        </button>
        {hasLocalOffset && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resetCardOffset(cardKey);
            }}
            className="p-1 rounded-md bg-neutral-900/90 text-white hover:text-amber-300 cursor-pointer shadow-xs inline-flex items-center justify-center"
            aria-label="Reset card position"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    );
  };

  const renderVmgoBody = () => {
    const sections = [
      { key: 'vision', title: 'VISION', placeholder: 'Paste or type school Vision statement (or upload VMGO PDF)...' },
      { key: 'mission', title: 'MISSION', placeholder: 'Paste or type school Mission statement...' },
      { key: 'goals', title: 'GOALS & OBJECTIVES', placeholder: 'Paste or type Institutional Goals & Objectives...' },
    ];

    return (
      <div className="flex-1 flex flex-col justify-center gap-2.5 min-h-0">
        {sections.map((sec) => {
          const val = data[sec.key] || '';
          if (!editable && !val.trim()) return null;
          return (
            <div
              key={sec.key}
              ref={(el) => {
                if (el) cardElsRef.current[sec.key] = el;
              }}
              onPointerDown={(e) => handleCardSurfacePointerDown(e, sec.key)}
              style={getCardContainerStyle(sec.key)}
              className={`relative group/card px-3.5 py-2.5 ${surfaceCls} ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingCardKey === sec.key ? 'ring-2 ring-amber-400/90 z-30' : ''}`}
            >
              {renderCardDragPill(sec.key)}
              <p
                className="font-mono uppercase tracking-[0.2em] font-bold mb-1"
                style={{
                  color: accentColor,
                  fontSize: `${Math.max(8, Math.round(baseFontPx * 0.85 * 10) / 10)}px`,
                  textAlign: headerAlign,
                }}
              >
                {sec.title}
              </p>
              {editable ? (
                <textarea
                  value={val}
                  onChange={(e) => updateField({ [sec.key]: e.target.value })}
                  rows={sec.key === 'goals' ? 3 : 2}
                  placeholder={sec.placeholder}
                  {...textFocusBind}
                  style={{
                    color: effectiveTextColor,
                    fontFamily: activeFontFamily,
                    fontSize: `${baseFontPx}px`,
                    textAlign: bodyAlign,
                  }}
                  className="w-full bg-transparent leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded p-0.5 placeholder:text-neutral-400/80"
                />
              ) : (
                <p
                  className="leading-relaxed whitespace-pre-line"
                  style={{
                    color: effectiveTextColor,
                    fontFamily: activeFontFamily,
                    fontSize: `${baseFontPx}px`,
                    textAlign: bodyAlign,
                  }}
                >
                  {val}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProgrammeBody = () => {
    const subtitleVal = data.subtitle || '';
    const bodyVal = data.body || '';

    return (
      <div
        ref={(el) => {
          if (el) cardElsRef.current.main = el;
        }}
        onPointerDown={(e) => handleCardSurfacePointerDown(e, 'main')}
        style={getCardContainerStyle('main')}
        className={`relative group/card flex-1 flex flex-col px-4 py-3 min-h-0 ${surfaceCls} ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingCardKey === 'main' ? 'ring-2 ring-amber-400/90 z-30' : ''}`}
      >
        {renderCardDragPill('main')}
        {(editable || subtitleVal.trim()) && (
          <div className="pb-2 mb-2 border-b border-current/15 shrink-0">
            {editable ? (
              <input
                type="text"
                value={subtitleVal}
                onChange={(e) => updateField({ subtitle: e.target.value })}
                placeholder="Date, Time & Commencement Venue (optional)"
                {...textFocusBind}
                style={{
                  color: effectiveMutedColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${Math.max(8.5, Math.round(baseFontPx * 0.92 * 10) / 10)}px`,
                  textAlign: headerAlign,
                }}
                className="w-full bg-transparent uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded px-1 py-0.5 placeholder:text-neutral-400"
              />
            ) : (
              <p
                className="uppercase tracking-wider"
                style={{
                  color: effectiveMutedColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${Math.max(8.5, Math.round(baseFontPx * 0.92 * 10) / 10)}px`,
                  textAlign: headerAlign,
                }}
              >
                {subtitleVal}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {editable ? (
            <textarea
              value={bodyVal}
              onChange={(e) => updateField({ body: e.target.value })}
              placeholder="Paste Graduation Programme sequence (Processional, Invocation, National Anthem, Welcome Address, Conferral of Degrees, Recessional) or upload Programme PDF above..."
              {...textFocusBind}
              style={{
                color: effectiveTextColor,
                fontFamily: activeFontFamily,
                fontSize: `${baseFontPx}px`,
                textAlign: bodyAlign,
              }}
              className="w-full flex-1 bg-transparent leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded p-1 placeholder:text-neutral-400/80"
            />
          ) : (
            <div
              className="leading-relaxed whitespace-pre-line overflow-hidden"
              style={{
                color: effectiveTextColor,
                fontFamily: activeFontFamily,
                fontSize: `${baseFontPx}px`,
                textAlign: bodyAlign,
              }}
            >
              {bodyVal}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMessageBody = () => {
    const photoUrl = (data.photoUrl || '').trim();
    const officialName = data.name || '';
    const roleTitle = data.roleTitle || meta.defaultTitle || '';
    const messageBody = data.message || '';
    const isUploadingPhoto = uploadingField === `${sectionKey}:photo`;

    return (
      <div
        ref={(el) => {
          if (el) cardElsRef.current.main = el;
        }}
        onPointerDown={(e) => handleCardSurfacePointerDown(e, 'main')}
        style={getCardContainerStyle('main')}
        className={`relative group/card flex-1 flex flex-col justify-between px-4 py-3.5 min-h-0 ${surfaceCls} ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingCardKey === 'main' ? 'ring-2 ring-amber-400/90 z-30' : ''}`}
      >
        {renderCardDragPill('main')}
        {/* Top Official Portrait + Identity */}
        <div className="flex flex-col items-center text-center gap-1.5 shrink-0 pb-2.5 border-b border-current/10">
          <div className="relative group">
            <div className="w-20 h-24 rounded-xl overflow-hidden border-2 bg-neutral-100 flex items-center justify-center shadow-sm" style={{ borderColor: accentColor }}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={officialName || roleTitle}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-400 p-1.5 text-center">
                  <Camera size={16} />
                  <span className="text-[8px] font-mono uppercase mt-1 leading-tight">
                    Upload Photo
                  </span>
                </div>
              )}
            </div>

            {editable && (
              <div className={`absolute inset-0 rounded-xl flex items-center justify-center gap-1 transition-opacity ${photoUrl ? 'bg-black/55 opacity-0 group-hover:opacity-100' : 'bg-black/5 hover:bg-black/25'}`}>
                <label
                  title="Upload or replace official portrait (PNG, JPG, PDF)"
                  className="px-2 py-1 rounded-lg bg-neutral-900/90 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer hover:bg-neutral-800"
                >
                  {isUploadingPhoto ? (
                    <Loader2 size={10} className="animate-spin text-amber-400" />
                  ) : (
                    <Upload size={10} className="text-amber-400" />
                  )}
                  <span>{photoUrl ? 'Swap' : 'Photo'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(e) => onUploadPhoto?.(e, sectionKey)}
                    className="hidden"
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => updateField({ photoUrl: '' })}
                    className="p-1 rounded-lg bg-rose-600/90 text-white hover:bg-rose-700 cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Official Name */}
          <div className="w-full max-w-xs space-y-0.5">
            {editable ? (
              <input
                type="text"
                value={officialName}
                onChange={(e) => updateField({ name: e.target.value })}
                placeholder={`Enter ${meta.shortLabel} Full Name & Credentials`}
                {...textFocusBind}
                style={{
                  color: headerColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${Math.round(baseFontPx * 1.15 * 10) / 10}px`,
                  textAlign: headerAlign,
                }}
                className="w-full bg-transparent font-bold focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded px-1.5 py-0.5 placeholder:text-neutral-400"
              />
            ) : (
              officialName && (
                <p
                  className="font-bold tracking-tight"
                  style={{
                    color: headerColor,
                    fontFamily: activeFontFamily,
                    fontSize: `${Math.round(baseFontPx * 1.15 * 10) / 10}px`,
                    textAlign: headerAlign,
                  }}
                >
                  {officialName}
                </p>
              )
            )}

            {/* Official Office / Role Title */}
            {editable ? (
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => updateField({ roleTitle: e.target.value })}
                placeholder="Office / Designation"
                {...textFocusBind}
                style={{
                  color: accentColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${Math.max(8, Math.round(baseFontPx * 0.9 * 10) / 10)}px`,
                  textAlign: headerAlign,
                }}
                className="w-full bg-transparent uppercase tracking-[0.14em] font-bold focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded px-1.5 py-0.5 placeholder:text-neutral-400"
              />
            ) : (
              roleTitle && (
                <p
                  className="uppercase tracking-[0.14em] font-bold"
                  style={{
                    color: accentColor,
                    fontFamily: activeFontFamily,
                    fontSize: `${Math.max(8, Math.round(baseFontPx * 0.9 * 10) / 10)}px`,
                    textAlign: headerAlign,
                  }}
                >
                  {roleTitle}
                </p>
              )
            )}
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 min-h-0 pt-2.5 flex flex-col overflow-hidden">
          {editable ? (
            <textarea
              value={messageBody}
              onChange={(e) => updateField({ message: e.target.value })}
              placeholder={`Paste or type the official commencement message of the ${roleTitle || meta.shortLabel}, or click Import PDF above...`}
              {...textFocusBind}
              style={{
                color: effectiveTextColor,
                fontFamily: activeFontFamily,
                fontSize: `${baseFontPx}px`,
                textAlign: bodyAlign,
              }}
              className="w-full flex-1 bg-transparent leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded p-1 placeholder:text-neutral-400/80"
            />
          ) : (
            <p
              className="leading-relaxed whitespace-pre-line"
              style={{
                color: effectiveTextColor,
                fontFamily: activeFontFamily,
                fontSize: `${baseFontPx}px`,
                textAlign: bodyAlign,
              }}
            >
              {messageBody}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={sheetRef}
      onClick={() => setSelectedImageId(null)}
      className="h-full w-full bg-white relative overflow-hidden select-none"
    >
      {/* Background Artwork Uploaded First by Admin */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt="Institutional Page Background"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Optional Readability Scrim */}
      {bgUrl && scrimOpacity > 0 && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ opacity: scrimOpacity / 100 }}
        />
      )}

      {/* Safe Print Content Container */}
      <div
        className="relative z-10 h-full w-full flex flex-col gap-2.5"
        style={{
          paddingTop: `${padTop}px`,
          paddingBottom: `${padBottom}px`,
          paddingLeft: `${padX}px`,
          paddingRight: `${padX}px`,
        }}
      >
        {/* Top Institutional Header */}
        <div
          className="space-y-1 shrink-0"
          style={{ textAlign: headerAlign }}
        >
          {/* Direct Photo / School Seal Placement Above School Name */}
          {(data.topPhotoUrl || (editable && sectionKey === 'vmgo')) && (
            <div
              className={`flex ${headerAlign === 'left'
                  ? 'justify-start'
                  : headerAlign === 'right'
                    ? 'justify-end'
                    : 'justify-center'
                }`}
            >
              {data.topPhotoUrl ? (
                <div
                  className="relative group inline-flex items-center justify-center"
                  style={{ width: `${Math.min(160, Math.max(32, Number(data.topPhotoSizePx || 64)))}px` }}
                >
                  <img
                    src={data.topPhotoUrl}
                    alt={institutionHeaderValue || 'School Seal or Photo'}
                    className="w-full h-auto max-h-24 object-contain rounded-lg"
                  />
                  {editable && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-neutral-900/95 text-white shadow-lg z-30 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cur = Number(data.topPhotoSizePx || 64);
                          updateField({ topPhotoSizePx: Math.max(32, cur - 8) });
                        }}
                        className="p-0.5 hover:text-amber-300 cursor-pointer"
                      >
                        <Minus size={9} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cur = Number(data.topPhotoSizePx || 64);
                          updateField({ topPhotoSizePx: Math.min(160, cur + 8) });
                        }}
                        className="p-0.5 hover:text-amber-300 cursor-pointer"
                      >
                        <Plus size={9} />
                      </button>
                      <label className="p-0.5 hover:text-amber-300 cursor-pointer">
                        <Upload size={9} />
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          onChange={(e) => onUploadPhoto?.(e, sectionKey, 'topPhotoUrl')}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField({ topPhotoUrl: '' });
                        }}
                        className="p-0.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-dashed border-amber-400/70 bg-white/75 hover:bg-white text-[9.5px] font-bold text-amber-900 cursor-pointer shadow-2xs transition-colors">
                  {uploadingField === `${sectionKey}:topPhotoUrl` ? (
                    <Loader2 size={10} className="animate-spin text-amber-600" />
                  ) : (
                    <Camera size={10} className="text-amber-600" />
                  )}
                  <span>+ Add Photo Above School</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(e) => onUploadPhoto?.(e, sectionKey, 'topPhotoUrl')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {(editable || Boolean(institutionHeaderValue.trim())) && (
            editable ? (
              <input
                type="text"
                value={institutionHeaderValue}
                onChange={(e) => updateField({ institutionHeader: e.target.value })}
                placeholder="Institution Name · Academic Year (click to edit)"
                {...textFocusBind}
                style={{
                  color: accentColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${eyebrowFontPx}px`,
                  textAlign: headerAlign,
                }}
                className="w-full bg-transparent uppercase tracking-[0.22em] font-bold focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded px-2 py-0.5 placeholder:text-neutral-400/70"
              />
            ) : (
              <p
                className="uppercase tracking-[0.22em] font-bold"
                style={{
                  color: accentColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${eyebrowFontPx}px`,
                  textAlign: headerAlign,
                }}
              >
                {institutionHeaderValue}
              </p>
            )
          )}

          {editable ? (
            <input
              type="text"
              value={data.heading ?? meta.label}
              onChange={(e) => updateField({ heading: e.target.value })}
              {...textFocusBind}
              style={{
                color: headerColor,
                fontFamily: activeFontFamily,
                fontSize: `${headingFontPx}px`,
                textAlign: headerAlign,
              }}
              className="w-full bg-transparent font-bold tracking-tight focus:outline-none focus:ring-1 focus:ring-amber-400/70 rounded px-2 py-0.5"
            />
          ) : (
            <h2
              className="font-bold tracking-tight"
              style={{
                color: headerColor,
                fontFamily: activeFontFamily,
                fontSize: `${headingFontPx}px`,
                textAlign: headerAlign,
              }}
            >
              {data.heading || meta.label}
            </h2>
          )}

          <div
            className={`h-[1.5px] w-14 rounded-full opacity-75 ${headerAlign === 'left'
                ? 'mr-auto'
                : headerAlign === 'right'
                  ? 'ml-auto'
                  : 'mx-auto'
              }`}
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* Category-specific content */}
        {meta.kind === 'vmgo' && renderVmgoBody()}
        {meta.kind === 'document' && renderProgrammeBody()}
        {meta.kind === 'message' && renderMessageBody()}
      </div>

      {/* Live Smart Alignment & Margin Guides while dragging cards */}
      {editable && draggingCardKey && alignGuides && (
        <div className="pointer-events-none absolute inset-0 z-25">
          {/* Page safe margin frame */}
          <div
            className={`absolute inset-y-0 border-l border-dashed transition-colors ${alignGuides.marginAligned ? 'border-amber-400' : 'border-amber-300/40'}`}
            style={{ left: `${padX}px` }}
          />
          <div
            className={`absolute inset-y-0 border-r border-dashed transition-colors ${alignGuides.marginAligned ? 'border-amber-400' : 'border-amber-300/40'}`}
            style={{ right: `${padX}px` }}
          />
          <div
            className={`absolute inset-x-0 border-t border-dashed transition-colors ${alignGuides.topMarginHit ? 'border-amber-400' : 'border-amber-300/40'}`}
            style={{ top: `${padTop}px` }}
          />
          <div
            className={`absolute inset-x-0 border-b border-dashed transition-colors ${alignGuides.bottomMarginHit ? 'border-amber-400' : 'border-amber-300/40'}`}
            style={{ bottom: `${padBottom}px` }}
          />
          {/* Center axis / sibling card vertical alignment line */}
          {alignGuides.marginAligned && (
            <div className="absolute inset-y-0 left-1/2 -translate-x-px border-l border-dashed border-amber-400/90" />
          )}
          {alignGuides.siblingGuideX !== null && (
            <div
              className="absolute inset-y-0 border-l border-dashed border-emerald-400"
              style={{ left: `${alignGuides.siblingGuideX}px` }}
            />
          )}
        </div>
      )}

      {/* Custom Admin-Added Extra Text & Image Overlays (Directly Replaceable / Movable) */}
      {extraBlocks.map((block) => {
        const left = `${Number(block.xPct ?? 50)}%`;
        const top = `${Number(block.yPct ?? 78)}%`;
        const isDragging = draggingBlockId === block.id;

        if (block.type === 'image') {
          const isSelected = selectedImageId === block.id;
          const imgWidth = Math.min(400, Math.max(28, Number(block.widthPx ?? 88)));
          const toolbarBelow = Number(block.yPct ?? 78) < 18;
          return (
            <div
              key={block.id}
              style={{
                left,
                top,
                width: `${imgWidth}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute z-20 group ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${editable && isSelected ? 'ring-2 ring-amber-400 rounded-lg' : ''} ${isDragging ? 'ring-2 ring-amber-500 rounded-lg' : ''}`}
              onClick={(e) => {
                if (!editable) return;
                e.stopPropagation();
                setSelectedImageId(block.id);
              }}
              onPointerDown={(e) => {
                setSelectedImageId(block.id);
                handlePointerStart(e, block);
              }}
            >
              <img
                src={block.url}
                alt={block.caption || 'Inserted Graphic'}
                className="w-full h-auto object-contain rounded-md pointer-events-none"
              />
              {editable && (
                <>
                  {/* Resize (- / px / +) & Delete Floating Controls */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 ${toolbarBelow ? '-bottom-8' : '-top-8'} flex items-center gap-1 px-1.5 py-1 rounded-xl bg-neutral-900/95 text-white shadow-xl border border-white/15 whitespace-nowrap z-30 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => updateExtraBlock(block.id, { widthPx: Math.max(28, imgWidth - 14) })}
                      className="p-0.5 rounded hover:bg-white/15 hover:text-amber-300 cursor-pointer"
                      aria-label="Shrink image"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-[9px] font-mono font-bold text-neutral-200 min-w-[28px] text-center">
                      {imgWidth}px
                    </span>
                    <button
                      type="button"
                      onClick={() => updateExtraBlock(block.id, { widthPx: Math.min(400, imgWidth + 14) })}
                      className="p-0.5 rounded hover:bg-white/15 hover:text-amber-300 cursor-pointer"
                      aria-label="Enlarge image"
                    >
                      <Plus size={10} />
                    </button>
                    <span className="w-px h-3 bg-white/20 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImageId(null);
                        removeExtraBlock(block.id);
                      }}
                      className="p-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                      aria-label="Delete image"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>

                  {/* Corner Drag-to-Resize Handle */}
                  <div
                    onPointerDown={(e) => handleResizeStart(e, block)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Drag corner to resize image"
                    className={`absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow cursor-nwse-resize z-30 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  />
                </>
              )}
            </div>
          );
        }

        return (
          <div
            key={block.id}
            style={{
              left,
              top,
              width: `${Number(block.widthPct ?? 72)}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-20 group rounded-lg px-2 py-1 ${editable ? 'bg-white/85 border border-amber-300/80 shadow-xs' : ''}`}
          >
            {editable && (
              <div className="flex items-center justify-between gap-1 mb-0.5 opacity-80 group-hover:opacity-100">
                <button
                  type="button"
                  onPointerDown={(e) => handlePointerStart(e, block)}
                  className="p-0.5 rounded text-amber-800 hover:bg-amber-100 cursor-grab active:cursor-grabbing inline-flex items-center justify-center"
                  aria-label="Drag text block"
                >
                  <Move size={10} />
                </button>
                <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                  {[
                    { id: 'left', Icon: AlignLeft },
                    { id: 'center', Icon: AlignCenter },
                    { id: 'right', Icon: AlignRight },
                  ].map((al) => {
                    const AlignIcon = al.Icon;
                    const activeAl = (block.align || 'center') === al.id;
                    return (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => updateExtraBlock(block.id, { align: al.id })}
                        className={`p-0.5 rounded cursor-pointer ${activeAl ? 'bg-amber-200 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                        title={`Align ${al.id}`}
                      >
                        <AlignIcon size={9} />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => removeExtraBlock(block.id)}
                    className="p-0.5 text-neutral-400 hover:text-rose-600 cursor-pointer"
                    title="Remove text"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            )}
            {editable ? (
              <textarea
                value={block.content || ''}
                onChange={(e) => updateExtraBlock(block.id, { content: e.target.value })}
                rows={2}
                placeholder="Type custom note, caption, or signatory..."
                {...textFocusBind}
                style={{
                  color: effectiveTextColor,
                  fontFamily: activeFontFamily,
                  fontSize: `${Math.max(8, Math.round(baseFontPx * 0.95 * 10) / 10)}px`,
                  textAlign: block.align || 'center',
                }}
                className="w-full bg-transparent leading-snug resize-none focus:outline-none"
              />
            ) : (
              block.content && (
                <p
                  className="leading-snug whitespace-pre-line"
                  style={{
                    color: effectiveTextColor,
                    fontFamily: activeFontFamily,
                    fontSize: `${Math.max(8, Math.round(baseFontPx * 0.95 * 10) / 10)}px`,
                    textAlign: block.align || 'center',
                  }}
                >
                  {block.content}
                </p>
              )
            )}
          </div>
        );
      })}

    </div>
  );
}

YearbookInstitutionalSheet.propTypes = {
  sectionKey: PropTypes.string,
  bgUrl: PropTypes.string,
  data: PropTypes.object,
  tpl: PropTypes.object,
  config: PropTypes.object,
  editable: PropTypes.bool,
  uploadingField: PropTypes.string,
  onUpdateSection: PropTypes.func,
  onUploadPhoto: PropTypes.func,
  onTextFocusChange: PropTypes.func,
};
