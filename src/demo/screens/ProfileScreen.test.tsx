import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { initialState } from "../state/reducer";
import { ProfileScreen } from "./ProfileScreen";

it("shows only the name when an expert's age is absent", () => {
  const state = initialState(new Date("2026-11-14T00:00:00Z"));
  const { age: _age, ...margaret } = state.margaret;
  const markup = renderToStaticMarkup(<ProfileScreen state={{ ...state, margaret }} dispatch={() => {}} />);
  expect(markup).toContain(`<h3>${margaret.name}</h3>`);
});
