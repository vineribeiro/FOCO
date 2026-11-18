import type {RepDBExercise} from './repdbAssets';
import type {RepDBPortugueseCopy} from './repdbInstructionsPtBR';

/** FOCO-authored variants missing from the pinned source. The legacy repdb_id
 * field stores these namespaced media IDs too; source remains explicitly FOCO.
 * No substitute stock images: if own media fails, show the text fallback. */
export const FOCO_LOCAL_EXERCISES:RepDBExercise[]=[
 {id:'foco-rope-triceps-pushdown',name_en:'Rope Triceps Pushdown',source:'foco',body_part:'upper_arms',equipment:'cable',primary_muscles:['triceps_brachii'],secondary_muscles:[],is_bodyweight:false,images:{flat:{}}},
 {id:'foco-dumbbell-stiff-leg-deadlift',name_en:'Dumbbell Stiff-Leg Deadlift',source:'foco',body_part:'upper_legs',equipment:'dumbbell',primary_muscles:['hamstrings','gluteus_maximus'],secondary_muscles:['erector_spinae'],is_bodyweight:false,images:{flat:{}}},
 {id:'foco-barbell-wrist-extension',name_en:'Seated Barbell Wrist Extension',source:'foco',body_part:'lower_arms',equipment:'barbell',primary_muscles:['forearm_extensors'],secondary_muscles:[],is_bodyweight:false,images:{flat:{}}},
 {id:'foco-cable-wrist-extension',name_en:'Seated Cable Wrist Extension',source:'foco',body_part:'lower_arms',equipment:'cable',primary_muscles:['forearm_extensors'],secondary_muscles:[],is_bodyweight:false,images:{flat:{}}},
];
export const FOCO_LOCAL_NAMES:Record<string,string>={
 'foco-rope-triceps-pushdown':'Tríceps pulley com corda',
 'foco-dumbbell-stiff-leg-deadlift':'Stiff com halteres',
 'foco-barbell-wrist-extension':'Extensão de punho com barra',
 'foco-cable-wrist-extension':'Extensão de punho na polia',
};
export const FOCO_LOCAL_COPY:Record<string,RepDBPortugueseCopy>={
 'foco-barbell-wrist-extension':{
  description:'Extensão dos punhos com barra reta, em posição sentada e com as palmas voltadas para baixo.',
  instructions:['Sente-se em um banco estável, apoie os pés no chão e segure uma barra leve com as palmas voltadas para baixo.','Incline o tronco o suficiente para apoiar os antebraços sobre as coxas, deixando as mãos livres além dos joelhos.','Com os antebraços apoiados e os cotovelos parados, eleve o dorso das mãos estendendo os punhos em uma amplitude confortável.','Retorne lentamente, deixando os punhos descerem com controle e mantendo a pegada na barra.'],
  tips:['Mova os punhos, sem transformar o exercício em uma rosca de cotovelos.','Mantenha as palmas voltadas para baixo; a pegada com palmas para cima corresponde à flexão de punho.','Use carga que permita controlar a amplitude sem dor ou movimento dos antebraços.'],
 },
 'foco-cable-wrist-extension':{
  description:'Extensão dos punhos usando barra reta na polia baixa, com antebraços apoiados e pegada pronada.',
  instructions:['Prenda uma barra reta à polia baixa e sente-se em um banco estável de frente para o cabo.','Segure a barra com as palmas voltadas para baixo e apoie os antebraços sobre as coxas, deixando as mãos além dos joelhos.','Mantenha o cabo alinhado ao centro da barra e eleve o dorso das mãos estendendo os punhos, sem levantar os antebraços do apoio.','Retorne lentamente à posição inicial, mantendo a pegada e o controle da resistência da polia.'],
  tips:['Mantenha os cotovelos parados; o movimento acontece nos punhos.','Ajuste banco e distância da polia para manter apoio e trajetória confortáveis.','Evite usar a imagem de flexão de punho como referência: aqui as palmas permanecem voltadas para baixo.'],
 },
 'foco-rope-triceps-pushdown':{
  description:'Extensão de cotovelos na polia alta usando corda, com os braços próximos ao tronco.',
  instructions:['Prenda uma corda à polia alta e segure uma ponta em cada mão, com as palmas voltadas uma para a outra.','Fique de frente para a polia, estabilize o tronco e mantenha os cotovelos próximos às costelas.','Estenda os cotovelos levando as mãos para baixo. Separe levemente as pontas da corda ao final, sem mover os ombros para trás.','Retorne com controle, flexionando os cotovelos e mantendo os braços junto ao corpo.'],
  tips:['Use uma carga que permita controlar a volta sem balançar o tronco.','Mantenha os punhos alinhados aos antebraços e evite forçar o travamento dos cotovelos.'],
 },
 'foco-dumbbell-stiff-leg-deadlift':{
  description:'Inclinação do tronco pelo quadril com halteres, mantendo os joelhos quase estendidos e sem travá-los.',
  instructions:['Fique em pé com os pés aproximadamente na largura do quadril e um halter em cada mão, à frente das coxas.','Mantenha uma pequena flexão dos joelhos e estabilize essa posição durante o movimento.','Leve o quadril para trás e incline o tronco, mantendo os halteres próximos das pernas e a coluna em posição confortável.','Desça apenas até a amplitude que consegue controlar sem arredondar as costas.','Estenda o quadril para voltar a ficar em pé, sem inclinar o tronco para trás no final.'],
  tips:['A amplitude depende da sua mobilidade; não é necessário encostar os halteres no chão.','Evite transformar a descida em um agachamento; conduza o movimento pelo quadril.'],
 },
};
