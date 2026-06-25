import { describe, expect, it } from "vitest";
import { parseIikoPoint } from "./client";

describe("parseIikoPoint", () => {
  it("splits «ПИМС Город - Точка (ЮрЛицо)» into city + point", () => {
    expect(parseIikoPoint("ПИМС Владивосток - Седанка (ООО ФРЕШ ДВ)")).toEqual({
      city: "Владивосток",
      point: "Седанка",
    });
  });

  it("keeps hyphens inside the point name (space-dash-space is the only separator)", () => {
    expect(parseIikoPoint("ПИМС Владивосток - Пр-кт Красного Знамени (ООО ФРЕШ ДВ)")).toEqual({
      city: "Владивосток",
      point: "Пр-кт Красного Знамени",
    });
  });

  it("keeps hyphens inside the city name", () => {
    expect(parseIikoPoint("ПИМС Южно-Сахалинск - Фархутдинова (ООО ФРЕШ ДВ)")).toEqual({
      city: "Южно-Сахалинск",
      point: "Фархутдинова",
    });
  });

  it("is case-insensitive on the «Пимс» prefix and tolerates a trailing space in the entity", () => {
    expect(parseIikoPoint("Пимс Новосибирск - Мега Ватутина (ООО ФРЕШ ДВ )")).toEqual({
      city: "Новосибирск",
      point: "Мега Ватутина",
    });
  });

  it("works without a legal-entity suffix", () => {
    expect(parseIikoPoint("ПИМС Новосибирск - ТЦ Аура")).toEqual({
      city: "Новосибирск",
      point: "ТЦ Аура",
    });
  });

  it("returns city=null for names that don't follow the convention", () => {
    expect(parseIikoPoint("Центральный Склад Сочи")).toEqual({
      city: null,
      point: "Центральный Склад Сочи",
    });
  });
});
