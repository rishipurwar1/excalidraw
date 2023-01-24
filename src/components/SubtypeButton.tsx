import { getShortcutKey, updateActiveTool } from "../utils";
import { t } from "../i18n";
import { Action } from "../actions/types";
import { ToolButton } from "./ToolButton";
import clsx from "clsx";
import {
  Subtype,
  getSubtypeNames,
  hasAlwaysEnabledActions,
  isValidSubtype,
  subtypeCollides,
} from "../subtypes";
import { ExcalidrawElement, Theme } from "../element/types";
import {
  useExcalidrawActionManager,
  useExcalidrawContainer,
  useExcalidrawSetAppState,
} from "./App";
import { ContextMenuItems } from "./ContextMenu";

export const SubtypeButton = (
  subtype: Subtype,
  parentType: ExcalidrawElement["type"],
  icon: ({ theme }: { theme: Theme }) => JSX.Element,
  key?: string,
) => {
  const title = key !== undefined ? ` - ${getShortcutKey(key)}` : "";
  const keyTest: Action["keyTest"] =
    key !== undefined ? (event) => event.code === `Key${key}` : undefined;
  const subtypeAction: Action = {
    name: subtype,
    trackEvent: false,
    predicate: (...rest) => rest[4]?.source === subtype,
    perform: (elements, appState) => {
      const inactive = !appState.activeSubtypes?.includes(subtype) ?? true;
      const activeSubtypes: Subtype[] = [];
      if (appState.activeSubtypes) {
        activeSubtypes.push(...appState.activeSubtypes);
      }
      let activated = false;
      if (inactive) {
        // Ensure `element.subtype` is well-defined
        if (!subtypeCollides(subtype, activeSubtypes)) {
          activeSubtypes.push(subtype);
          activated = true;
        }
      } else {
        // Can only be active if appState.activeSubtypes is defined
        // and contains subtype.
        activeSubtypes.splice(activeSubtypes.indexOf(subtype), 1);
      }
      const type =
        appState.activeTool.type !== "custom" &&
        isValidSubtype(subtype, appState.activeTool.type)
          ? appState.activeTool.type
          : parentType;
      const activeTool = !inactive
        ? appState.activeTool
        : updateActiveTool(appState, { type });
      const selectedElementIds = activated ? {} : appState.selectedElementIds;
      const selectedGroupIds = activated ? {} : appState.selectedGroupIds;

      return {
        appState: {
          ...appState,
          activeSubtypes,
          selectedElementIds,
          selectedGroupIds,
          activeTool,
        },
        commitToHistory: true,
      };
    },
    keyTest,
    PanelComponent: ({ elements, appState, updateData, data }) => (
      <ToolButton
        type="icon"
        icon={icon.call(this, { theme: appState.theme })}
        selected={
          appState.activeSubtypes !== undefined &&
          appState.activeSubtypes.includes(subtype)
        }
        className={clsx({
          selected:
            appState.activeSubtypes &&
            appState.activeSubtypes.includes(subtype),
        })}
        title={`${t(`toolBar.${subtype}`)}${title}`}
        aria-label={t(`toolBar.${subtype}`)}
        onClick={() => {
          updateData(null);
        }}
        onContextMenu={
          data && "onContextMenu" in data
            ? (event: React.MouseEvent) => {
                if (
                  appState.activeSubtypes === undefined ||
                  (appState.activeSubtypes !== undefined &&
                    !appState.activeSubtypes.includes(subtype))
                ) {
                  updateData(null);
                }
                data.onContextMenu(event, subtype);
              }
            : undefined
        }
        size={data?.size || "medium"}
      ></ToolButton>
    ),
  };
  if (key === "") {
    delete subtypeAction.keyTest;
  }
  return subtypeAction;
};

export const SubtypeToggles = () => {
  const am = useExcalidrawActionManager();
  const { container } = useExcalidrawContainer();
  const setAppState = useExcalidrawSetAppState();

  const onContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    source: string,
  ) => {
    event.preventDefault();

    const { top: offsetTop, left: offsetLeft } =
      container!.getBoundingClientRect();
    const left = event.clientX - offsetLeft;
    const top = event.clientY - offsetTop;

    const items: ContextMenuItems = [];
    am.getCustomActions({ data: { source } }).forEach((action) =>
      items.push(action),
    );
    setAppState({}, () => {
      setAppState({
        contextMenu: { top, left, items },
      });
    });
  };

  return (
    <>
      {getSubtypeNames().map((subtype) =>
        am.renderAction(
          subtype,
          hasAlwaysEnabledActions(subtype) ? { onContextMenu } : {},
        ),
      )}
    </>
  );
};

SubtypeToggles.displayName = "SubtypeToggles";