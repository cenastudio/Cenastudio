/**
 * VirtualList - Lista virtualizada para performance com muitos items
 *
 * Usa react-window para renderizar apenas items visíveis no viewport.
 * **QUANDO USAR:** Listas com 100+ items onde scroll performance é crítica
 *
 * **EXEMPLOS DE USO:**
 * - Analytics: Histórico de lançamentos com 200+ registros
 * - VideoReviews: Lista de comments com 100+ comentários
 * - Projects: Lista com 150+ projetos
 *
 * **PERFORMANCE GAINS:**
 * - Renderiza apenas ~10-20 items visíveis (vs. todos os items)
 * - Scroll 60fps mesmo com 1000+ items
 * - Reduz React re-renders em 80-90%
 *
 * **TRADE-OFF:** Adiciona complexidade. Só use quando necessário (100+ items).
 * Para listas < 100 items, rendering normal é mais simples e igualmente performático.
 */

import { memo, forwardRef } from "react";
import { FixedSizeList, VariableSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  height?: number | string;
  width?: number | string;
  className?: string;
  overscanCount?: number;
  onScroll?: (scrollOffset: number) => void;
}

function VirtualListInner<T>({
  items,
  itemHeight,
  renderItem,
  height = "100%",
  width = "100%",
  className = "",
  overscanCount = 5,
  onScroll,
}: VirtualListProps<T>) {
  const isVariableHeight = typeof itemHeight === "function";

  // Wrapper component for react-window
  const Row = memo(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    return <div style={style}>{renderItem(item, index, style)}</div>;
  });

  Row.displayName = "VirtualListRow";

  if (isVariableHeight) {
    return (
      <div className={className} style={{ height, width }}>
        <AutoSizer>
          {({ height: autoHeight, width: autoWidth }) => (
            <VariableSizeList
              height={autoHeight}
              width={autoWidth}
              itemCount={items.length}
              itemSize={itemHeight as (index: number) => number}
              overscanCount={overscanCount}
              onScroll={({ scrollOffset }) => onScroll?.(scrollOffset)}
            >
              {Row}
            </VariableSizeList>
          )}
        </AutoSizer>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, width }}>
      <AutoSizer>
        {({ height: autoHeight, width: autoWidth }) => (
          <FixedSizeList
            height={autoHeight}
            width={autoWidth}
            itemCount={items.length}
            itemSize={itemHeight as number}
            overscanCount={overscanCount}
            onScroll={({ scrollOffset }) => onScroll?.(scrollOffset)}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
}

// Export with generic type preserved
export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

/**
 * VirtualGrid - Grid virtualizado para cards/thumbnails
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number | string;
  width?: number | string;
  gap?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  renderItem,
  height = "100%",
  width = "100%",
  gap = 16,
  className = "",
}: VirtualGridProps<T>) {
  // Calculate columns based on container width
  const getColumnCount = (containerWidth: number) => {
    return Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  };

  const getRowCount = (columnCount: number) => {
    return Math.ceil(items.length / columnCount);
  };

  return (
    <div className={className} style={{ height, width }}>
      <AutoSizer>
        {({ height: autoHeight, width: autoWidth }) => {
          const columnCount = getColumnCount(autoWidth);
          const rowCount = getRowCount(columnCount);

          const Row = ({ index, style }: ListChildComponentProps) => {
            const startIndex = index * columnCount;
            const endIndex = Math.min(startIndex + columnCount, items.length);
            const rowItems = items.slice(startIndex, endIndex);

            return (
              <div
                style={{
                  ...style,
                  display: "flex",
                  gap: `${gap}px`,
                  paddingRight: `${gap}px`,
                }}
              >
                {rowItems.map((item, colIndex) => (
                  <div
                    key={startIndex + colIndex}
                    style={{ width: itemWidth, height: itemHeight }}
                  >
                    {renderItem(item, startIndex + colIndex)}
                  </div>
                ))}
              </div>
            );
          };

          return (
            <FixedSizeList
              height={autoHeight}
              width={autoWidth}
              itemCount={rowCount}
              itemSize={itemHeight + gap}
              overscanCount={2}
            >
              {Row}
            </FixedSizeList>
          );
        }}
      </AutoSizer>
    </div>
  );
}
