const payload = { "type": "@webflow/XscpData", "payload": { "nodes": [], "styles": [], "assets": [], "ix1": [], "ix2": { "interactions": [], "events": [], "actionLists": [] } }, "meta": { "unlinkedSymbolCount": 0, "droppedLinks": 0, "dynBindRemovedCount": 0, "dynListBindRemovedCount": 0, "paginationRemovedCount": 0 } };
const dt = new DataTransfer();
dt.setData('application/json', JSON.stringify(payload));
const e = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true });
console.log(e.clipboardData.getData('application/json'));
