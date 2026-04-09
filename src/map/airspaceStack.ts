import L, { type Map as LeafletMap } from "leaflet";

const ICAO_CLASS_NAMES = [
  "Class A",
  "Class B",
  "Class C",
  "Class D",
  "Class E",
  "Class F",
  "Class G",
  "Other",
  "SUA",
];

export function icaoClassName(icaoClass: number): string {
  return ICAO_CLASS_NAMES[icaoClass] ?? `Unknown (${icaoClass})`;
}

const AIRSPACE_TYPE_NAMES = [
  "Other",
  "Restricted",
  "Danger",
  "Prohibited",
  "CTR",
  "TMZ",
  "RMZ",
  "TMA",
  "TRA",
  "TSA",
  "FIR",
  "UIR",
  "ADIZ",
  "ATZ",
  "MATZ",
  "Airway",
  "MTR",
  "Alert Area",
  "Warning Area",
  "Protected Area",
  "HTZ",
  "Gliding Sector",
  "TRP",
  "TIZ",
  "TIA",
  "MTA",
  "CTA",
  "ACC",
  "Aerial Sporting/Recreational",
  "Low Altitude Overflight Restriction",
  "MRT",
  "TFR",
  "VFR Sector",
  "FIS Sector",
  "LTA",
  "UTA",
  "MCTR",
];

const ACTIVITY_NAMES = [
  "None",
  "Parachuting",
  "Aerobatics",
  "Aeroclub/Aerial Work",
  "ULM",
  "Hang Gliding/Paragliding",
];

export function activityName(activity: number): string {
  return ACTIVITY_NAMES[activity] ?? `Unknown (${activity})`;
}

export function airspaceTypeName(type: number): string {
  return AIRSPACE_TYPE_NAMES[type] ?? `Unknown (${type})`;
}

const MIN_CEILING = 10_000;
const CEIL_STEP = 5_000;

const ICAO_CLASS_HEX: Record<number, string> = {
  0: "#CC0000",
  1: "#1A73E8",
  2: "#1A73E8",
  3: "#22A7E0",
  4: "#E91E63",
  5: "#E91E63",
  6: "#808080",
  7: "#808080",
  8: "#808080",
};

const TYPE_HEX_OVERRIDES: Record<number, string> = {
  1: "#FF0000",
  2: "#FFB300",
  3: "#FF0000",
  5: "#E91E63",
  17: "#FFB300",
  18: "#FFB300",
  21: "#008000",
  25: "#FFB300",
  28: "#008000",
};

const ACTIVITY_HEX_OVERRIDES: Record<number, string> = {
  1: "#008000",
  5: "#008000",
};

export function airspaceColor(entry: {
  type: number;
  icaoClass: number;
  activity: number;
}): string {
  if (entry.activity && ACTIVITY_HEX_OVERRIDES[entry.activity]) {
    return ACTIVITY_HEX_OVERRIDES[entry.activity];
  }

  if (TYPE_HEX_OVERRIDES[entry.type] !== undefined) {
    return TYPE_HEX_OVERRIDES[entry.type];
  }

  return ICAO_CLASS_HEX[entry.icaoClass] ?? "#808080";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface AirspaceEntry {
  name: string;
  type: number;
  icaoClass: number;
  lowerFt: number;
  upperFt: number;
  lowerLabel: string;
  upperLabel: string;
  activity: number;
  flags: string[];
  activeReason: string;
  active: boolean;
}

type AirspaceFeature = {
  properties?: {
    name?: string;
    type?: number;
    icaoClass?: number;
    lowerFt?: number;
    upperFt?: number;
    lowerLabel?: string;
    upperLabel?: string;
    activity?: number;
    flags?: string[];
    activeReason?: string;
    active?: boolean;
  };
};

export class AirspaceStackControl extends L.Control {
  private container!: HTMLDivElement;
  private stackArea!: HTMLDivElement;
  private aircraftLine!: HTMLDivElement;
  private aircraftLabel!: HTMLDivElement;
  private altLabel!: HTMLSpanElement;
  private entries: AirspaceEntry[] = [];
  private columnOf: number[] = [];
  private blocks: HTMLDivElement[] = [];
  private ticks: HTMLDivElement[] = [];
  private aircraftAlt = 0;
  private maxAlt = MIN_CEILING;
  private dragging = false;
  private manualWidthPx: number | null = null;
  private onBlockClicked?: (entry: AirspaceEntry, index: number) => void;
  private onAltChanged?: (ft: number) => void;
  private readonly onWindowResize = (): void => {
    this.syncWidth(Math.max(1, new Set(this.columnOf).size));
  };
  private readonly activeDragCleanups: Array<() => void> = [];

  constructor(opts?: {
    onBlockClicked?: (entry: AirspaceEntry, index: number) => void;
    onAltChanged?: (ft: number) => void;
  }) {
    super({ position: "bottomright" });
    this.onBlockClicked = opts?.onBlockClicked;
    this.onAltChanged = opts?.onAltChanged;
  }

  onAdd(_map: LeafletMap): HTMLElement {
    this.container = L.DomUtil.create(
      "div",
      "airspace-stack-control",
    ) as HTMLDivElement;
    L.DomEvent.disableClickPropagation(this.container);
    L.DomEvent.disableScrollPropagation(this.container);
    window.addEventListener("resize", this.onWindowResize);

    const header = L.DomUtil.create(
      "div",
      "airspace-stack-header",
      this.container,
    ) as HTMLDivElement;
    const titleEl = L.DomUtil.create("span", "", header) as HTMLSpanElement;
    titleEl.textContent = "Airspace";
    this.altLabel = L.DomUtil.create(
      "span",
      "airspace-stack-alt-label",
      header,
    ) as HTMLSpanElement;
    this.altLabel.textContent = "0 ft";

    this.stackArea = L.DomUtil.create(
      "div",
      "airspace-stack-area",
      this.container,
    ) as HTMLDivElement;
    this.aircraftLine = L.DomUtil.create(
      "div",
      "airspace-stack-aircraft",
      this.stackArea,
    ) as HTMLDivElement;
    this.aircraftLabel = L.DomUtil.create(
      "div",
      "airspace-stack-aircraft-label",
      this.aircraftLine,
    ) as HTMLDivElement;

    const leftHandle = L.DomUtil.create(
      "div",
      "airspace-stack-resize-handle left",
      this.container,
    ) as HTMLDivElement;
    this.bindResizeHandle(leftHandle, ({ clientX }) => {
      const rect = this.container.getBoundingClientRect();
      const newWidth = Math.max(this.getMinWidthPx(), rect.right - clientX);
      this.manualWidthPx = newWidth;
      this.syncWidth(Math.max(1, new Set(this.columnOf).size));
    });

    const topHandle = L.DomUtil.create(
      "div",
      "airspace-stack-resize-handle top",
      this.container,
    ) as HTMLDivElement;
    this.bindResizeHandle(topHandle, ({ clientY }) => {
      const rect = this.container.getBoundingClientRect();
      const newHeight = Math.max(100, rect.bottom - clientY);
      this.container.style.height = `${newHeight}px`;
      this.stackArea.style.height = `${newHeight - 35}px`;
    });

    const cornerHandle = L.DomUtil.create(
      "div",
      "airspace-stack-resize-handle corner",
      this.container,
    ) as HTMLDivElement;
    this.bindResizeHandle(cornerHandle, ({ clientX, clientY }) => {
      const rect = this.container.getBoundingClientRect();
      const newWidth = Math.max(this.getMinWidthPx(), rect.right - clientX);
      const newHeight = Math.max(100, rect.bottom - clientY);
      this.manualWidthPx = newWidth;
      this.syncWidth(Math.max(1, new Set(this.columnOf).size));
      this.container.style.height = `${newHeight}px`;
      this.stackArea.style.height = `${newHeight - 35}px`;
    });

    this.stackArea.addEventListener("click", (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target === this.stackArea ||
        target === this.aircraftLine ||
        target.classList.contains("airspace-stack-tick")
      ) {
        const popup = this.container.querySelector(".airspace-detail-popup");
        popup?.remove();
      }
    });

    this.setupLineEvents();
    this.setAltitudeVisuals(0);
    this.renderTicks();
    requestAnimationFrame(() => this.syncWidth(1));

    return this.container;
  }

  onRemove(_map: LeafletMap): void {
    this.clearActiveDragCleanups();
    window.removeEventListener("resize", this.onWindowResize);
  }

  private clearActiveDragCleanups(): void {
    while (this.activeDragCleanups.length > 0) {
      this.activeDragCleanups.pop()?.();
    }
  }

  private getTouchClientPoint(event: TouchEvent): {
    clientX: number;
    clientY: number;
  } | null {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) {
      return null;
    }

    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  }

  private bindResizeHandle(
    handle: HTMLDivElement,
    onDrag: (point: { clientX: number; clientY: number }) => void,
  ): void {
    let dragging = false;

    const stopDragging = () => {
      if (!dragging) {
        return;
      }

      dragging = false;
      this.container.classList.remove("resizing");
      this.clearActiveDragCleanups();
    };

    const startDragging = () => {
      dragging = true;
      this.container.classList.add("resizing");
      this.clearActiveDragCleanups();

      const pointerMove = (event: PointerEvent) => {
        if (!dragging) {
          return;
        }

        event.preventDefault();
        onDrag({ clientX: event.clientX, clientY: event.clientY });
      };

      const pointerUp = () => {
        stopDragging();
      };

      const touchMove = (event: TouchEvent) => {
        if (!dragging) {
          return;
        }

        const point = this.getTouchClientPoint(event);
        if (!point) {
          return;
        }

        event.preventDefault();
        onDrag(point);
      };

      const touchEnd = () => {
        stopDragging();
      };

      window.addEventListener("pointermove", pointerMove, { passive: false });
      window.addEventListener("pointerup", pointerUp);
      window.addEventListener("pointercancel", pointerUp);
      window.addEventListener("touchmove", touchMove, { passive: false });
      window.addEventListener("touchend", touchEnd);
      window.addEventListener("touchcancel", touchEnd);

      this.activeDragCleanups.push(() =>
        window.removeEventListener("pointermove", pointerMove),
      );
      this.activeDragCleanups.push(() =>
        window.removeEventListener("pointerup", pointerUp),
      );
      this.activeDragCleanups.push(() =>
        window.removeEventListener("pointercancel", pointerUp),
      );
      this.activeDragCleanups.push(() =>
        window.removeEventListener("touchmove", touchMove),
      );
      this.activeDragCleanups.push(() =>
        window.removeEventListener("touchend", touchEnd),
      );
      this.activeDragCleanups.push(() =>
        window.removeEventListener("touchcancel", touchEnd),
      );
    };

    handle.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      startDragging();
      onDrag({ clientX: event.clientX, clientY: event.clientY });
    });

    handle.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        const point = this.getTouchClientPoint(event);
        if (!point) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        startDragging();
        onDrag(point);
      },
      { passive: false },
    );
  }

  private getMinWidthPx(): number {
    return parseFloat(getComputedStyle(this.container).minWidth) || 100;
  }

  private getViewportMarginPx(): number {
    return (
      parseFloat(
        getComputedStyle(this.container).getPropertyValue(
          "--airspace-stack-viewport-margin",
        ),
      ) || 8
    );
  }

  private getColumnWidthVw(): number {
    return (
      parseFloat(
        getComputedStyle(this.container).getPropertyValue(
          "--airspace-stack-column-width-vw",
        ),
      ) || 5
    );
  }

  private getAvailableWidthPx(): number {
    const rect = this.container.getBoundingClientRect();
    const margin = this.getViewportMarginPx();
    return Math.max(this.getMinWidthPx(), rect.right - margin);
  }

  private clampWidthPx(widthPx: number): number {
    return Math.max(
      this.getMinWidthPx(),
      Math.min(widthPx, this.getAvailableWidthPx()),
    );
  }

  private computeAutoWidthPx(numCols: number): number {
    return (
      (window.innerWidth * this.getColumnWidthVw() * Math.max(1, numCols)) / 100
    );
  }

  private syncWidth(numCols: number): void {
    const desiredWidth = this.manualWidthPx ?? this.computeAutoWidthPx(numCols);
    this.container.style.width = `${Math.round(this.clampWidthPx(desiredWidth))}px`;
  }

  private setupLineEvents(): void {
    const updateFromPointer = (event: PointerEvent) => {
      const rect = this.stackArea.getBoundingClientRect();
      const ratio =
        1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const value = Math.max(
        0,
        Math.min(this.maxAlt, Math.round((ratio * this.maxAlt) / 100) * 100),
      );
      this.setAltitudeVisuals(value);
      this.onAltChanged?.(value);
    };

    this.aircraftLine.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      this.dragging = true;
      this.aircraftLine.setPointerCapture(event.pointerId);
      this.aircraftLine.classList.add("dragging");
    });

    this.aircraftLine.addEventListener("pointermove", (event: PointerEvent) => {
      if (!this.dragging) {
        return;
      }

      event.preventDefault();
      updateFromPointer(event);
    });

    this.aircraftLine.addEventListener("pointerup", (event: PointerEvent) => {
      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.aircraftLine.releasePointerCapture(event.pointerId);
      this.aircraftLine.classList.remove("dragging");
    });

    this.container.addEventListener(
      "touchmove",
      (event) => event.preventDefault(),
      {
        passive: false,
      },
    );
  }

  private setAltitudeVisuals(ft: number): void {
    this.aircraftAlt = ft;
    const pct = this.maxAlt > 0 ? (ft / this.maxAlt) * 100 : 0;
    this.altLabel.textContent = `${ft.toLocaleString()} ft`;
    this.aircraftLine.style.bottom = `${pct}%`;
    this.aircraftLabel.textContent = `${ft.toLocaleString()} ft`;
    this.reorderAndHighlight();
  }

  getValue(): number {
    return this.aircraftAlt;
  }

  setValue(ft: number): void {
    const clamped = Math.max(
      0,
      Math.min(this.maxAlt, Math.round(ft / 100) * 100),
    );
    this.setAltitudeVisuals(clamped);
    this.onAltChanged?.(clamped);
  }

  update(features: AirspaceFeature[]): void {
    this.entries = features.map((feature) => ({
      name: feature.properties?.name ?? "?",
      type: feature.properties?.type ?? 0,
      icaoClass: feature.properties?.icaoClass ?? 0,
      lowerFt: feature.properties?.lowerFt ?? 0,
      upperFt: feature.properties?.upperFt ?? 0,
      lowerLabel: feature.properties?.lowerLabel ?? "?",
      upperLabel: feature.properties?.upperLabel ?? "?",
      activity: feature.properties?.activity ?? 0,
      flags: feature.properties?.flags ?? [],
      activeReason: feature.properties?.activeReason ?? "24h",
      active: feature.properties?.active ?? true,
    }));

    this.entries.sort((left, right) => left.lowerFt - right.lowerFt);

    const highestFt = this.entries.reduce(
      (maxUpper, entry) => Math.max(maxUpper, entry.upperFt),
      0,
    );
    const newMax = Math.max(
      MIN_CEILING,
      Math.ceil(highestFt / CEIL_STEP) * CEIL_STEP,
    );
    if (newMax !== this.maxAlt) {
      this.maxAlt = newMax;
      this.renderTicks();
      this.setAltitudeVisuals(Math.min(this.aircraftAlt, this.maxAlt));
    }

    this.renderBlocks();
  }

  clear(): void {
    this.entries = [];
    this.renderBlocks();
  }

  private renderTicks(): void {
    for (const tick of this.ticks) {
      tick.remove();
    }
    this.ticks = [];

    for (let altitude = 0; altitude <= this.maxAlt; altitude += CEIL_STEP) {
      const tick = L.DomUtil.create(
        "div",
        "airspace-stack-tick",
        this.stackArea,
      ) as HTMLDivElement;
      tick.style.bottom = `${(altitude / this.maxAlt) * 100}%`;
      tick.dataset.label =
        altitude >= 10000 ? `${altitude / 1000}k` : `${altitude}`;
      this.ticks.push(tick);
    }
  }

  private renderBlocks(): void {
    for (const block of this.blocks) {
      block.remove();
    }
    this.blocks = [];

    if (this.entries.length === 0) {
      this.columnOf = [];
      this.syncWidth(1);
      return;
    }

    const columnTops: number[] = [];
    this.columnOf = [];

    for (const entry of this.entries) {
      const column = columnTops.findIndex((top) => top === entry.lowerFt);
      if (column >= 0) {
        this.columnOf.push(column);
        columnTops[column] = entry.upperFt;
      } else {
        this.columnOf.push(columnTops.length);
        columnTops.push(entry.upperFt);
      }
    }

    const numCols = columnTops.length;
    this.syncWidth(numCols);

    const colOrder = this.computeColumnOrder(numCols);

    this.entries.forEach((entry, index) => {
      const bottomPct = (entry.lowerFt / this.maxAlt) * 100;
      const topPct = (entry.upperFt / this.maxAlt) * 100;
      const heightPct = topPct - bottomPct;
      const displayCol = colOrder[this.columnOf[index]];
      const colWidth = 100 / numCols;

      const block = L.DomUtil.create(
        "div",
        "airspace-block",
        this.stackArea,
      ) as HTMLDivElement;
      block.style.bottom = `${bottomPct}%`;
      block.style.height = `${heightPct}%`;
      block.style.left = `${displayCol * colWidth}%`;
      block.style.width = `${colWidth}%`;
      const hex = airspaceColor(entry);
      block.style.backgroundColor = hexToRgba(hex, 0.35);
      block.style.borderColor = hexToRgba(hex, 0.8);

      const label = L.DomUtil.create(
        "div",
        "airspace-block-label",
        block,
      ) as HTMLDivElement;
      label.innerHTML = `<span class="airspace-block-name">${entry.name}</span>`;

      block.addEventListener("click", (event: MouseEvent) => {
        this.showDetail(entry, event);
        this.onBlockClicked?.(entry, index);
      });
      block.title = `${entry.name}: ${entry.lowerLabel} – ${entry.upperLabel}`;

      this.blocks.push(block);
    });

    this.highlightCurrent();
  }

  private computeColumnOrder(numCols: number): number[] {
    const colClass: number[] = new Array(numCols).fill(Infinity);
    this.entries.forEach((entry, index) => {
      const col = this.columnOf[index];
      if (
        this.aircraftAlt >= entry.lowerFt &&
        this.aircraftAlt < entry.upperFt
      ) {
        colClass[col] = Math.min(colClass[col], entry.icaoClass);
      }
    });

    const indices = Array.from({ length: numCols }, (_, index) => index);
    indices.sort((left, right) => colClass[left] - colClass[right]);

    const order: number[] = new Array(numCols);
    indices.forEach((origCol, displayPos) => {
      order[origCol] = displayPos;
    });
    return order;
  }

  private reorderAndHighlight(): void {
    if (this.entries.length === 0 || this.blocks.length === 0) {
      return;
    }

    const numCols = new Set(this.columnOf).size;
    const colOrder = this.computeColumnOrder(numCols);
    const colWidth = 100 / numCols;

    this.entries.forEach((_entry, index) => {
      const block = this.blocks[index];
      if (!block) {
        return;
      }

      const displayCol = colOrder[this.columnOf[index]];
      block.style.left = `${displayCol * colWidth}%`;
    });

    this.highlightCurrent();
  }

  private highlightCurrent(): void {
    this.entries.forEach((entry, index) => {
      const block = this.blocks[index];
      if (!block) {
        return;
      }

      const inside =
        this.aircraftAlt >= entry.lowerFt && this.aircraftAlt < entry.upperFt;
      const hex = airspaceColor(entry);
      if (inside) {
        block.style.backgroundColor = hexToRgba(hex, 0.7);
        block.classList.add("airspace-block-active");
      } else {
        block.style.backgroundColor = hexToRgba(hex, 0.35);
        block.classList.remove("airspace-block-active");
      }
    });
  }

  private showDetail(entry: AirspaceEntry, event: MouseEvent): void {
    const old = this.container.querySelector(".airspace-detail-popup");
    old?.remove();

    const popup = L.DomUtil.create(
      "div",
      "airspace-detail-popup",
      this.container,
    ) as HTMLDivElement;
    const activeHtml = entry.active
      ? '<span style="color:green">ACTIVE</span>'
      : '<span style="color:grey">INACTIVE</span>';

    popup.innerHTML = `
      <div class="airspace-detail-close">&times;</div>
      <b>${entry.name}</b><br>
      ${airspaceTypeName(entry.type)}, ${icaoClassName(entry.icaoClass)}<br>
      ${entry.activity ? `${activityName(entry.activity)}<br>` : ""}
      Lower: ${entry.lowerLabel} (${entry.lowerFt.toLocaleString()} ft)<br>
      Upper: ${entry.upperLabel} (${entry.upperFt.toLocaleString()} ft)<br>
      Status: ${activeHtml} (${entry.activeReason})${entry.flags.length ? `<br>${entry.flags.join(", ")}` : ""}
    `;

    popup
      .querySelector(".airspace-detail-close")
      ?.addEventListener("click", () => {
        popup.remove();
      });

    popup.style.position = "fixed";
    popup.style.pointerEvents = "auto";
    popup.style.visibility = "hidden";
    popup.style.left = "0";
    popup.style.top = "0";

    this.container.appendChild(popup);
    const rect = popup.getBoundingClientRect();
    const popupWidth = rect.width;
    const popupHeight = rect.height;

    let x = event.clientX - popupWidth / 2;
    let y = event.clientY - popupHeight / 2;
    const margin = 8;
    x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
    y = Math.max(
      margin,
      Math.min(y, window.innerHeight - popupHeight - margin),
    );

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.visibility = "visible";
  }
}
