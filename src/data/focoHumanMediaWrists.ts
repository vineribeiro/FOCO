import type {FocoHumanMedia} from './focoHumanMedia';
/** Original FOCO wrist-extension pairs. No source-dataset images were used.
 * Provenance and visual screening: docs/media/FOCO_HUMAN_WRISTS_2026_11_18.json. */
export const FOCO_HUMAN_MEDIA_WRISTS:Record<string,FocoHumanMedia>={
 'foco-barbell-wrist-extension':{
  asset:'media/foco-human/2026-11-18-wrists/wrist-extension-pairs.webp',width:1330,height:1182,
  poses:[{x:14,y:12,width:640,height:570,phase:'start'},{x:678,y:12,width:640,height:570,phase:'peak'}],
 },
 'foco-cable-wrist-extension':{
  asset:'media/foco-human/2026-11-18-wrists/wrist-extension-pairs.webp',width:1330,height:1182,
  poses:[{x:14,y:606,width:640,height:564,phase:'start'},{x:678,y:606,width:640,height:564,phase:'peak'}],
 },
};
