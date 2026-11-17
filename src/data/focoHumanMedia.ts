import {repdbIdForExercise,repdbBindingBlocked} from './repdbAssets';
import {REPDB_PTBR_NAMES} from './repdbPtBR';

export interface HumanPoseFrame {x:number;y:number;width:number;height:number;phase:'start'|'peak'|'reference'}
export interface FocoHumanMedia {asset:string;width:number;height:number;poses:HumanPoseFrame[]}
/** Own AI illustrations, visually screened per variant. Full provenance and scope:
 * docs/media/FOCO_HUMAN_PILOT_2026_11_17.json. No RepDB images used as inputs.
 * Static frames preserve the original drawing; no interpolation or inferred variants. */
export const FOCO_HUMAN_MEDIA:Record<string,FocoHumanMedia> = {
  "db-bench-press": {
    "asset": "media/foco-human/2026-11-17/db-bench-press.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 1003,
        "y": 0,
        "width": 940,
        "height": 803,
        "phase": "start"
      },
      {
        "x": 32,
        "y": 0,
        "width": 940,
        "height": 803,
        "phase": "peak"
      }
    ]
  },
  "goblet-squat": {
    "asset": "media/foco-human/2026-11-17/goblet-squat.webp",
    "width": 1774,
    "height": 887,
    "poses": [
      {
        "x": 160,
        "y": 0,
        "width": 600,
        "height": 887,
        "phase": "start"
      },
      {
        "x": 1020,
        "y": 0,
        "width": 600,
        "height": 887,
        "phase": "peak"
      }
    ]
  },
  "single-arm-db-row": {
    "asset": "media/foco-human/2026-11-17/single-arm-db-row.webp",
    "width": 1956,
    "height": 804,
    "poses": [
      {
        "x": 20,
        "y": 0,
        "width": 900,
        "height": 804,
        "phase": "start"
      },
      {
        "x": 1000,
        "y": 0,
        "width": 900,
        "height": 804,
        "phase": "peak"
      }
    ]
  },
  "dumbbell-calf-raise": {
    "asset": "media/foco-human/2026-11-17/dumbbell-calf-raise.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 350,
        "y": 0,
        "width": 500,
        "height": 803,
        "phase": "start"
      },
      {
        "x": 1150,
        "y": 0,
        "width": 500,
        "height": 803,
        "phase": "peak"
      }
    ]
  },
  "plank": {
    "asset": "media/foco-human/2026-11-17/plank.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 0,
        "y": 0,
        "width": 1958,
        "height": 803,
        "phase": "reference"
      }
    ]
  },
  "dumbbell-romanian-deadlift": {
    "asset": "media/foco-human/2026-11-17/dumbbell-romanian-deadlift.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 350,
        "y": 0,
        "width": 500,
        "height": 803,
        "phase": "start"
      },
      {
        "x": 1150,
        "y": 0,
        "width": 500,
        "height": 803,
        "phase": "peak"
      }
    ]
  },
  "lateral-raise": {
    "asset": "media/foco-human/2026-11-17/lateral-raise.webp",
    "width": 1774,
    "height": 887,
    "poses": [
      {
        "x": 40,
        "y": 0,
        "width": 800,
        "height": 887,
        "phase": "start"
      },
      {
        "x": 920,
        "y": 0,
        "width": 800,
        "height": 887,
        "phase": "peak"
      }
    ]
  },
  "hammer-curl": {
    "asset": "media/foco-human/2026-11-17/hammer-curl.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 300,
        "y": 0,
        "width": 600,
        "height": 803,
        "phase": "start"
      },
      {
        "x": 1100,
        "y": 0,
        "width": 600,
        "height": 803,
        "phase": "peak"
      }
    ]
  },
  "glute-bridge": {
    "asset": "media/foco-human/2026-11-17/glute-bridge.webp",
    "width": 2169,
    "height": 725,
    "poses": [
      {
        "x": 0,
        "y": 130,
        "width": 1050,
        "height": 540,
        "phase": "start"
      },
      {
        "x": 1100,
        "y": 130,
        "width": 1050,
        "height": 540,
        "phase": "peak"
      }
    ]
  },
  "lat-pulldown": {
    "asset": "media/foco-human/2026-11-17/lat-pulldown.webp",
    "width": 1958,
    "height": 803,
    "poses": [
      {
        "x": 225,
        "y": 0,
        "width": 650,
        "height": 803,
        "phase": "start"
      },
      {
        "x": 1125,
        "y": 0,
        "width": 650,
        "height": 803,
        "phase": "peak"
      }
    ]
  }
};
export function humanMediaForExercise(name:string,id?:string|null):FocoHumanMedia|null {
 if(repdbBindingBlocked(name,id))return null;
 const normalized=name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const originalNameId=Object.keys(FOCO_HUMAN_MEDIA).find(key=>REPDB_PTBR_NAMES[key].sourceName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')===normalized);
 const exactId=id||repdbIdForExercise(name)||originalNameId;
 return exactId?FOCO_HUMAN_MEDIA[exactId]||null:null;
}
