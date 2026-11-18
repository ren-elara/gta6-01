import { COURIER, PALETTE, VIEW } from './config.js';
import { ROUTES, courierRank, formatTicks, resultText } from './contracts.js';

export const courierCard = (index) => ({ x: 112, y: 158 + index * 91, width: 1056, height: 81 });
const acceptButton = { x: 112, y: 558, width: 460, height: 42 };
const cancelButton = { x: 592, y: 558, width: 576, height: 42 };
const contains = (box, point) => point && point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;

export function courierClick(point) {
  const index = ROUTES.findIndex((_, i) => contains(courierCard(i), point));
  if (index >= 0) return { select: index };
  if (contains(acceptButton, point)) return { accept: true };
  if (contains(cancelButton, point)) return { cancel: true };
  return null;
}

export function drawCourierMenu(ctx, text, panel, state, selected) {
  const { active, records, result } = state.contracts;
  const rank = courierRank(records);
  ctx.fillStyle = 'rgba(7,21,27,0.82)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(80, 52, 1120, 616, 'rgba(7,21,27,0.98)');
  text('HARBOR COURIER EXCHANGE', 112, 101, 27, PALETTE.courier, 'left', 800);
  text(`${rank.name} / ${rank.unique} OF 4 ROUTES`, 1168, 99, 12, PALETTE.cyan, 'right', 800);
  text('Independent favors. Your story stays with Kira. The city and contract clock are paused.', 112, 132, 14, PALETTE.muted);
  ROUTES.forEach((route, index) => {
    const box = courierCard(index);
    panel(box.x, box.y, box.width, box.height, selected === index ? 'rgba(213,164,255,0.16)' : 'rgba(255,248,233,0.025)');
    const record = records[route.id];
    text(`${index + 1}  ${route.name.toUpperCase()}`, box.x + 16, box.y + 25, 16, selected === index ? PALETTE.courier : PALETTE.white, 'left', 800);
    text(`${route.from} → ${route.to}`, box.x + 350, box.y + 25, 13, PALETTE.cyan);
    text(`$${route.reward} / ${route.seconds}s`, box.x + box.width - 16, box.y + 25, 14, PALETTE.gold, 'right', 800);
    text(route.description, box.x + 16, box.y + 49, 13, PALETTE.muted);
    text(active?.id === route.id ? `ACTIVE: ${active.phase.toUpperCase()} / ${formatTicks(active.ticks)} elapsed` : record ? `${record.completed} delivered / best ${formatTicks(record.bestTicks)}` : 'AVAILABLE / no record yet', box.x + 16, box.y + 69, 11, PALETTE.courier);
    text(`Express: ${route.par}s or less adds $${COURIER.expressBonus}`, box.x + box.width - 16, box.y + 66, 11, PALETTE.muted, 'right');
  });
  text(ROUTES[selected].directions, 112, 541, 14, PALETTE.white);
  panel(acceptButton.x, acceptButton.y, acceptButton.width, acceptButton.height);
  text(state.mission === 3 ? 'RESTART CHAPTER TO RUN CONTRACTS' : active ? 'C / ESC  RETURN TO ACTIVE ROUTE' : 'ENTER / CLICK  ACCEPT SELECTED ROUTE', 342, 584, 12, active ? PALETTE.muted : PALETTE.courier, 'center', 800);
  panel(cancelButton.x, cancelButton.y, cancelButton.width, cancelButton.height);
  text(active ? 'X / CLICK  CANCEL CONTRACT — NO FEE' : '1–4 / ↑↓  SELECT ROUTE', 880, 584, 12, active ? PALETTE.coral : PALETTE.muted, 'center', 800);
  text(result ? resultText(result) : 'Clock starts on acceptance. G collects / delivers within 100 m at low speed. Clinic visits lose the parcel.', 112, 624, 12, result?.outcome === 'delivered' ? PALETTE.cyan : PALETTE.muted);
  text('C / ESC CLOSE   L SAVE   O LOAD   M SOUND   R MOTION', 1168, 649, 10, PALETTE.gold, 'right', 700);
}
