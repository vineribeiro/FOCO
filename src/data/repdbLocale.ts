/** Vocabulary shown to athletes; source codes stay internal/searchable. */
const LABELS:Record<string,string>={
 chest:'Peitoral',back:'Costas',shoulders:'Ombros',arms:'Braços',biceps:'Bíceps',triceps:'Tríceps',legs:'Pernas',
 upper_arms:'Braços',lower_arms:'Antebraços',upper_legs:'Coxas e quadril',lower_legs:'Panturrilhas',
 quadriceps:'Quadríceps',hamstrings:'Posteriores da coxa',glutes:'Glúteos',calves:'Panturrilhas',
 abs:'Abdômen',core:'Abdômen e tronco',abdominals:'Abdômen',forearms:'Antebraços',cardio:'Cardio',full_body:'Corpo inteiro','full body':'Corpo inteiro',
 stretching:'Alongamento',neck:'Pescoço',lower_back:'Lombar',strength:'Força',olympic:'Levantamento olímpico',plyometrics:'Pliometria',
 beginner:'Iniciante',intermediate:'Intermediário',advanced:'Avançado',
 abductors:'Abdutores do quadril',adductors:'Adutores do quadril',anterior_deltoid:'Deltoide anterior',lateral_deltoid:'Deltoide lateral',posterior_deltoid:'Deltoide posterior',
 biceps_brachii:'Bíceps braquial',brachialis:'Braquial',brachioradialis:'Braquiorradial',erector_spinae:'Eretores da coluna',
 forearm_extensors:'Extensores do antebraço',forearm_flexors:'Flexores do antebraço',gastrocnemius:'Gastrocnêmio',
 gluteus_maximus:'Glúteo máximo',gluteus_medius:'Glúteo médio',hip_flexors:'Flexores do quadril',
 infraspinatus_teres_minor:'Infraespinhal e redondo menor',latissimus_dorsi:'Dorsal largo',obliques:'Oblíquos',
 pectoralis_major:'Peitoral maior',quadratus_lumborum:'Quadrado lombar',rectus_abdominis:'Reto abdominal',rhomboids:'Romboides',
 soleus:'Sóleo',tibialis_anterior:'Tibial anterior',transverse_abdominis:'Transverso abdominal',trapezius:'Trapézio',triceps_brachii:'Tríceps braquial',
 serratus_anterior:'Serrátil anterior',supraspinatus:'Supraespinhal',
 ab_crunch_machine:'Máquina de abdominal',ab_wheel:'Roda abdominal',air_bike:'Bicicleta com braços móveis',
 assisted_pullup_machine:'Máquina de assistência',back_extension_machine:'Máquina de extensão de tronco',barbell:'Barra reta',
 battle_rope:'Cordas navais',bicep_curl_machine:'Máquina de bíceps',bicycle:'Bicicleta',bosu_ball:'Meia bola de equilíbrio',
 cable:'Polia',chest_fly_machine:'Máquina de crucifixo',chest_press_machine:'Máquina de supino',climbing_rope:'Corda de escalada',
 dip_machine:'Máquina de tríceps',dip_station:'Barras paralelas',donkey_calf_raise_machine:'Máquina de panturrilha com tronco inclinado',
 dumbbell:'Halteres',elliptical:'Elíptico',ez_bar:'Barra EZ',flat_bench:'Banco reto',glute_ham_developer:'Banco de extensão de quadril e flexão de joelhos',
 hack_squat:'Máquina hack',hip_abduction_machine:'Máquina de abdução',hip_adduction_machine:'Máquina de adução',hip_thrust_machine:'Máquina de elevação de quadril',
 jump_rope:'Corda de pular',kettlebell:'Kettlebell',lat_pulldown_machine:'Máquina de puxada',leg_curl:'Máquina flexora',leg_extension:'Cadeira extensora',
 leg_press:'Leg press',loop_band:'Miniband',medicine_ball:'Bola medicinal',pec_deck:'Máquina de crucifixo (peck deck)',
 plate_loaded_dip_machine:'Máquina de tríceps com anilhas',plate_loaded_lateral_raise_machine:'Máquina de elevação lateral com anilhas',
 plates:'Anilhas',plyo_box:'Caixa de salto',preacher_curl_machine:'Máquina Scott',pull_up_bar:'Barra fixa',resistance_band:'Elástico',
 reverse_fly_machine:'Máquina de crucifixo inverso',rings:'Argolas',rower:'Remo ergométrico',sandbag:'Saco de carga',
 seated_calf_raise_machine:'Máquina de panturrilha sentada',seated_row_machine:'Máquina de remada sentada',shoulder_press_machine:'Máquina de desenvolvimento',
 shrug_machine:'Máquina de encolhimento',ski_erg:'Simulador de esqui',slam_ball:'Bola para arremesso ao chão',sled:'Trenó',smith_machine:'Smith',
 stability_ball:'Bola de estabilidade',stair_climber:'Simulador de escada',standing_calf_raise_machine:'Máquina de panturrilha em pé',
 stationary_bike:'Bicicleta ergométrica',suspension_trainer:'Fitas de suspensão',trap_bar:'Barra hexagonal',treadmill:'Esteira',
 tricep_extension_machine:'Máquina de extensão de tríceps',wall_ball:'Bola para arremesso à parede',wrist_roller:'Rolo de punhos',bodyweight:'Peso corporal',
};
export const repdbLabel=(value:string|undefined|null):string=>value?LABELS[value.toLowerCase()]||'Outro':'Não informado';
export const repdbEquipmentLabel=(item:{equipment?:string;is_bodyweight?:boolean}):string=>
 item.equipment?repdbLabel(item.equipment):item.is_bodyweight?'Peso corporal':'Sem equipamento externo informado';
export function repdbWorkoutGroup(item:{body_part?:string;primary_muscles?:string[]}):string {
 const muscles:Record<string,string>={pectoralis_major:'Peito',latissimus_dorsi:'Costas',rhomboids:'Costas',trapezius:'Costas',
  anterior_deltoid:'Ombros',lateral_deltoid:'Ombros',posterior_deltoid:'Ombros',biceps_brachii:'Bíceps',brachialis:'Bíceps',triceps_brachii:'Tríceps',
  forearm_flexors:'Antebraços',forearm_extensors:'Antebraços',brachioradialis:'Antebraços',quadriceps:'Quadríceps',hamstrings:'Posteriores',
  gluteus_maximus:'Glúteos',gluteus_medius:'Glúteos',gastrocnemius:'Panturrilhas',soleus:'Panturrilhas',
  rectus_abdominis:'Abdômen',transverse_abdominis:'Abdômen',obliques:'Abdômen'};
 const primary=item.primary_muscles?.map(m=>muscles[m]).find(Boolean);
 return primary||({chest:'Peito',back:'Costas',shoulders:'Ombros',upper_legs:'Pernas',lower_legs:'Panturrilhas',
  upper_arms:'Braços',lower_arms:'Antebraços',core:'Abdômen',full_body:'Geral'}[item.body_part||''])||'Geral';
}
