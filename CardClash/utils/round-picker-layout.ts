export interface RoundPickerLayoutInput {
  width: number;
  height: number;
  isLandscape: boolean;
  modalCardW: number;
  modalCardH: number;
}

export interface RoundPickerLayout {
  focusModalPadding: number;
  focusModalGap: number;
  focusModalWidth: number;
  stackRoundPicker: boolean;
  focusCardW: number;
  focusCardH: number;
  focusPickerW: number;
  roundPickerColumns: number;
  roundPickerGap: number;
  roundPickerChipW: number;
  roundPickerHeight: number;
}

/**
 * يضمن أن اختيار الجولات يبقى شبكة مضغوطة عند ازدياد العدد؛
 * في العمودي تكدّس المعاينة فوق الشبكة، وفي الأفقي تستخدم المساحة بجانبها.
 */
export function getRoundPickerLayout({
  width,
  height,
  isLandscape,
  modalCardW,
  modalCardH,
}: RoundPickerLayoutInput): RoundPickerLayout {
  const focusModalPadding = height < 440 ? 10 : 14;
  const focusModalGap = isLandscape ? 20 : 12;
  const focusModalWidth = Math.min(width - (isLandscape ? 48 : 24), isLandscape ? 820 : width - 24);
  const stackRoundPicker = !isLandscape;
  const focusCardW = Math.min(
    modalCardW,
    Math.max(112, isLandscape ? focusModalWidth * 0.3 : focusModalWidth * 0.36),
  );
  const focusCardH = Math.round(focusCardW * (modalCardH / modalCardW));
  const focusContentWidth = focusModalWidth - focusModalPadding * 2;
  const focusPickerW = stackRoundPicker
    ? focusContentWidth
    : Math.max(158, focusContentWidth - focusCardW - focusModalGap);
  const roundPickerColumns = stackRoundPicker
    ? (focusPickerW >= 420 ? 6 : 4)
    : (focusPickerW >= 420 ? 6 : 4);
  const roundPickerGap = 6;
  const roundPickerChipW = Math.floor((focusPickerW - roundPickerGap * (roundPickerColumns - 1)) / roundPickerColumns);
  const roundPickerHeight = stackRoundPicker
    ? Math.min(210, Math.max(150, height * 0.28))
    : Math.min(focusCardH, Math.max(166, height * 0.56));

  return {
    focusModalPadding,
    focusModalGap,
    focusModalWidth,
    stackRoundPicker,
    focusCardW,
    focusCardH,
    focusPickerW,
    roundPickerColumns,
    roundPickerGap,
    roundPickerChipW,
    roundPickerHeight,
  };
}

export function doesRoundPickerNeedScroll(
  totalRounds: number,
  layout: Pick<RoundPickerLayout, 'roundPickerColumns' | 'roundPickerGap' | 'roundPickerHeight'>,
): boolean {
  const rows = Math.ceil(totalRounds / layout.roundPickerColumns);
  const contentHeight = rows * 36 + Math.max(0, rows - 1) * layout.roundPickerGap;
  return contentHeight > layout.roundPickerHeight;
}
