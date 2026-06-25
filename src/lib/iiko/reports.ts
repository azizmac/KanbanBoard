import { olap, type OlapRow } from "./client";

export { iikoConfigured } from "./client";
export type { OlapRow };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Sales by point + channel for the period (raw OLAP rows). */
export function salesByDepartment(from: Date, to: Date): Promise<OlapRow[]> {
  return olap({
    reportType: "SALES",
    groupByRowFields: ["Department", "OrderType"],
    aggregateFields: ["DishDiscountSumInt", "UniqOrderId", "GuestNum", "ProductCostBase.ProductCost"],
    filter: {
      "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from: ymd(from), to: ymd(to) },
      DeletedWithWriteoff: {
        filterType: "ExcludeValues",
        values: ["DELETED_WITH_WRITEOFF", "DELETED_WITHOUT_WRITEOFF"],
      },
    },
  });
}

/** Revenue by day (or hour for the day period) — feeds the trend chart. */
export function revenueTrend(from: Date, to: Date, byHour = false): Promise<OlapRow[]> {
  return olap({
    reportType: "SALES",
    groupByRowFields: ["Department", byHour ? "HourOpen" : "OpenDate.Typed"],
    aggregateFields: ["DishDiscountSumInt"],
    filter: { "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from: ymd(from), to: ymd(to) } },
  });
}

/** Write-offs — a separate OLAP report. */
export function writeoffs(from: Date, to: Date): Promise<OlapRow[]> {
  return olap({
    reportType: "DELETIONS",
    groupByRowFields: ["Department"],
    aggregateFields: ["DishDiscountSumInt"],
    filter: {
      "OpenDate.Typed": { filterType: "DateRange", periodType: "CUSTOM", from: ymd(from), to: ymd(to) },
      DeletedWithWriteoff: { filterType: "IncludeValues", values: ["DELETED_WITH_WRITEOFF"] },
    },
  });
}

/** Map an iiko order-type name to a design channel. Configurable per install. */
export function orderTypeToChannel(orderType: string): "hall" | "delivery" | "pickup" {
  let map: Record<string, "hall" | "delivery" | "pickup"> = {};
  try {
    map = JSON.parse(process.env.IIKO_ORDER_TYPE_MAP ?? "{}");
  } catch {
    /* malformed env → default everything to hall */
  }
  return map[orderType] ?? "hall";
}
