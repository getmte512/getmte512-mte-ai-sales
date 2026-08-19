import type{ReviewAnnotation}from"./review-action-register";
export type SnapshotRef={id:string;period:"week"|"month";asOfDate:string;recordedAt:string};
export function buildReviewContextCoverage(snapshots:SnapshotRef[],annotations:ReviewAnnotation[]){const annotated=new Set(annotations.map(a=>a.snapshotId));const rows=snapshots.map(snapshot=>({...snapshot,hasContext:annotated.has(snapshot.id)}));return{rows,withContext:rows.filter(r=>r.hasContext).length,withoutContext:rows.filter(r=>!r.hasContext).length,latestUnannotated:rows.find(r=>!r.hasContext)??null};}
