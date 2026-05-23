import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReferenceRatePair, ReferenceRatePairId } from "../../types";
import { formatReferenceRate, getReferenceRateBuySell } from "../../utils/referenceRates";

const ROW_GRID =
  "grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_4.5rem] items-center gap-x-2";

function GripIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-400"
      aria-hidden
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

function SortableRateRow({
  id,
  pair,
}: {
  id: ReferenceRatePairId;
  pair: ReferenceRatePair;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const decimals = pair.displayDecimals ?? 3;
  const { buy, sell } = getReferenceRateBuySell(pair);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${ROW_GRID} cursor-grab border-b px-2 py-1 text-xs touch-none active:cursor-grabbing last:border-0 ${
        pair.kind === "derived" ? "bg-slate-50/80" : ""
      } ${isDragging ? "relative z-10 rounded bg-white shadow-md ring-1 ring-slate-200" : ""}`}
      aria-label={t("referenceRates.dragToReorder")}
      {...attributes}
      {...listeners}
    >
      <span className="flex items-center justify-center">
        <GripIcon />
      </span>
      <span className="truncate font-medium">{pair.label}</span>
      <span className="text-right font-mono tabular-nums">
        {formatReferenceRate(buy, decimals)}
      </span>
      <span className="text-right font-mono tabular-nums">
        {formatReferenceRate(sell, decimals)}
      </span>
    </div>
  );
}

export default function ReferenceRatesPanelTable({
  pairs,
  pairOrder,
  onReorder,
}: {
  pairs: Record<ReferenceRatePairId, ReferenceRatePair>;
  pairOrder: ReferenceRatePairId[];
  onReorder: (activeId: ReferenceRatePairId, overId: ReferenceRatePairId) => void;
}) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(active.id as ReferenceRatePairId, over.id as ReferenceRatePairId);
  };

  const visibleIds = pairOrder.filter((id) => pairs[id]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="min-w-[260px]">
        <div
          className={`${ROW_GRID} border-b px-2 py-1 text-xs font-semibold`}
          style={{ borderColor: "var(--theme-border)" }}
        >
          <span aria-hidden />
          <span>{t("referenceRates.pair")}</span>
          <span className="text-right">{t("referenceRates.buy")}</span>
          <span className="text-right">{t("referenceRates.sell")}</span>
        </div>
        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
          <div>
            {visibleIds.map((id) => (
              <SortableRateRow key={id} id={id} pair={pairs[id]} />
            ))}
          </div>
        </SortableContext>
      </div>
    </DndContext>
  );
}
