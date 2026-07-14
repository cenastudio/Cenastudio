import { memo, type CSSProperties, type ReactNode, type UIEvent } from "react";
import { List, type RowComponentProps } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  height?: number | string;
  width?: number | string;
  className?: string;
  overscanCount?: number;
  onScroll?: (scrollOffset: number) => void;
}

interface RowData<T> {
  items: T[];
  renderItem: VirtualListProps<T>["renderItem"];
}

function VirtualRow<T>({ index, style, items, renderItem }: RowComponentProps<RowData<T>>) {
  return <div style={style}>{renderItem(items[index], index, style)}</div>;
}

function VirtualListInner<T>({
  items, itemHeight, renderItem, height = "100%", width = "100%",
  className = "", overscanCount = 5, onScroll,
}: VirtualListProps<T>) {
  const rowHeight = typeof itemHeight === "function"
    ? (index: number) => itemHeight(index)
    : itemHeight;

  return (
    <div className={className} style={{ height, width }}>
      <AutoSizer renderProp={({ height: measuredHeight, width: measuredWidth }) => (
        <List
          rowComponent={VirtualRow<T>}
          rowCount={items.length}
          rowHeight={rowHeight}
          rowProps={{ items, renderItem }}
          overscanCount={overscanCount}
          style={{ height: measuredHeight ?? 0, width: measuredWidth ?? 0 }}
          onScroll={(event: UIEvent<HTMLDivElement>) => onScroll?.(event.currentTarget.scrollTop)}
        />
      )} />
    </div>
  );
}

export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  height?: number | string;
  width?: number | string;
  gap?: number;
  className?: string;
}

interface GridRowData<T> {
  items: T[];
  columnCount: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
  renderItem: VirtualGridProps<T>["renderItem"];
}

function VirtualGridRow<T>({ index, style, items, columnCount, itemWidth, itemHeight, gap, renderItem }: RowComponentProps<GridRowData<T>>) {
  const start = index * columnCount;
  return (
    <div style={{ ...style, display: "flex", gap, paddingRight: gap }}>
      {items.slice(start, start + columnCount).map((item, offset) => (
        <div key={start + offset} style={{ width: itemWidth, height: itemHeight }}>
          {renderItem(item, start + offset)}
        </div>
      ))}
    </div>
  );
}

export function VirtualGrid<T>({
  items, itemWidth, itemHeight, renderItem, height = "100%", width = "100%", gap = 16, className = "",
}: VirtualGridProps<T>) {
  return (
    <div className={className} style={{ height, width }}>
      <AutoSizer renderProp={({ height: measuredHeight, width: measuredWidth }) => {
        const availableWidth = measuredWidth ?? itemWidth;
        const columnCount = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
        return (
          <List
            rowComponent={VirtualGridRow<T>}
            rowCount={Math.ceil(items.length / columnCount)}
            rowHeight={itemHeight + gap}
            rowProps={{ items, columnCount, itemWidth, itemHeight, gap, renderItem }}
            overscanCount={2}
            style={{ height: measuredHeight ?? 0, width: availableWidth }}
          />
        );
      }} />
    </div>
  );
}
