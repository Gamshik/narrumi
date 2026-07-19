// CreativeBriefFieldOffsetInput describes nested layout coordinates inside the setup form.
export type CreativeBriefFieldOffsetInput = {
  // sectionOffsetY is the editor position inside the setup card.
  readonly sectionOffsetY: number;
  // groupOffsetY is the optional anchors group position inside the editor.
  readonly groupOffsetY: number;
  // fieldOffsetY is the input position inside its immediate editor group.
  readonly fieldOffsetY: number;
};

// resolveCreativeBriefFieldOffset converts nested coordinates into the setup card coordinate space.
export function resolveCreativeBriefFieldOffset({
  sectionOffsetY,
  groupOffsetY,
  fieldOffsetY,
}: CreativeBriefFieldOffsetInput): number {
  return sectionOffsetY + groupOffsetY + fieldOffsetY;
}
