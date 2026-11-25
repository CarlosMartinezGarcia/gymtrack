// Biblioteca de ejercicios de GymTrack. Ver docs/DECISIONES.md §13.
// Textos propios. Imágenes: Free Exercise DB (yuhonas/free-exercise-db), dominio público (Unlicense).
import type { MuscleId } from './muscles';

export type Equipment = 'machine' | 'cable' | 'dumbbell' | 'barbell' | 'bodyweight' | 'cardio';
export type CardioMachine = 'treadmill' | 'bike' | 'elliptical' | 'rower' | 'stairs';

export type Pattern =
  | 'empuje_horizontal' | 'empuje_inclinado' | 'aperturas' | 'fondos' | 'empuje_vertical'
  | 'tiron_vertical' | 'tiron_horizontal' | 'pullover'
  | 'elevacion_lateral' | 'elevacion_frontal' | 'deltoide_posterior' | 'encogimientos'
  | 'curl' | 'triceps'
  | 'sentadilla' | 'prensa' | 'extension_rodilla' | 'curl_femoral' | 'bisagra' | 'zancada'
  | 'gluteo' | 'aductor' | 'abductor' | 'gemelo'
  | 'core_flexion' | 'core_estabilidad' | 'lumbar'
  | 'cardio';

export interface LibraryExercise {
  id: string;
  name: string;
  /** Otros nombres con los que se conoce (para buscar y vincular). */
  aliases: string[];
  equipment: Equipment;
  pattern: Pattern;
  primary: MuscleId[];
  secondary: MuscleId[];
  /** MET de referencia para estimar calorías (Compendium of Physical Activities). */
  met: number;
  /** Solo cardio: tipo de máquina. */
  cardio?: CardioMachine;
  /** Carpeta de imágenes en Free Exercise DB (0.jpg = inicio, 1.jpg = final). */
  img?: string;
  setup: string[];
  technique: string[];
  errors: string[];
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  machine: 'Máquina', cable: 'Polea', dumbbell: 'Mancuernas', barbell: 'Barra', bodyweight: 'Peso corporal', cardio: 'Cardio',
};

// MET: multiarticular grande 6,0; multiarticular de tren superior 5,0; aislamiento 3,5; core 3,8.
const BIG = 6, UPPER = 5, ISO = 3.5, CORE = 3.8;

export const LIBRARY: LibraryExercise[] = [
  // ---------------- Pecho ----------------
  {
    id: 'press-pecho-maquina', name: 'Press de pecho en máquina', aliases: ['press de pecho', 'chest press', 'press pecho'],
    equipment: 'machine', pattern: 'empuje_horizontal', primary: ['pecho'], secondary: ['deltoide_anterior', 'triceps'], met: UPPER, img: 'Leverage_Chest_Press',
    setup: ['Ajusta el asiento para que las asas queden a la altura de la mitad del pecho.', 'Espalda apoyada en el respaldo, pies firmes en el suelo.', 'Hombros hacia atrás y abajo antes de empujar.'],
    technique: ['Empuja hasta casi estirar los codos sin bloquearlos.', 'Vuelve despacio (2-3 s) hasta notar el estiramiento del pecho.', 'Codos a unos 45-60° del cuerpo, no en cruz.'],
    errors: ['Despegar la espalda o los hombros del respaldo.', 'Asiento demasiado bajo: carga el hombro.'],
  },
  {
    id: 'press-banca-barra', name: 'Press de banca con barra', aliases: ['press banca', 'bench press', 'banca'],
    equipment: 'barbell', pattern: 'empuje_horizontal', primary: ['pecho'], secondary: ['deltoide_anterior', 'triceps'], met: UPPER, img: 'Barbell_Bench_Press_-_Medium_Grip',
    setup: ['Túmbate con los ojos bajo la barra.', 'Agarre algo más ancho que los hombros.', 'Junta las escápulas y apoya bien los pies.'],
    technique: ['Baja la barra controlada a la parte baja del pecho.', 'Empuja hacia arriba y ligeramente hacia la cara.', 'Muñecas rectas, encima de los codos.'],
    errors: ['Rebotar la barra en el pecho.', 'Abrir los codos a 90°.'],
  },
  {
    id: 'press-banca-mancuernas', name: 'Press de banca con mancuernas', aliases: ['press mancuernas', 'dumbbell press'],
    equipment: 'dumbbell', pattern: 'empuje_horizontal', primary: ['pecho'], secondary: ['deltoide_anterior', 'triceps'], met: UPPER, img: 'Dumbbell_Bench_Press',
    setup: ['Siéntate con las mancuernas sobre los muslos y túmbate llevándolas al pecho.', 'Escápulas juntas, pies en el suelo.'],
    technique: ['Empuja hasta arriba acercando un poco las mancuernas.', 'Baja hasta notar estiramiento, codos a 45-60°.'],
    errors: ['Bajar más allá de donde el hombro está cómodo.', 'Chocar las mancuernas arriba.'],
  },
  {
    id: 'press-inclinado-mancuernas', name: 'Press inclinado con mancuernas', aliases: ['press inclinado', 'incline press'],
    equipment: 'dumbbell', pattern: 'empuje_inclinado', primary: ['pecho', 'deltoide_anterior'], secondary: ['triceps'], met: UPPER, img: 'Incline_Dumbbell_Press',
    setup: ['Banco a 30-45°.', 'Escápulas juntas y pecho alto.'],
    technique: ['Empuja en línea recta por encima de la clavícula.', 'Baja controlado hasta la parte alta del pecho.'],
    errors: ['Banco demasiado vertical: se convierte en press de hombro.'],
  },
  {
    id: 'press-inclinado-maquina', name: 'Press inclinado en máquina', aliases: ['press inclinado maquina', 'incline chest press'],
    equipment: 'machine', pattern: 'empuje_inclinado', primary: ['pecho', 'deltoide_anterior'], secondary: ['triceps'], met: UPPER, img: 'Leverage_Incline_Chest_Press',
    setup: ['Asiento con las asas a la altura de la parte alta del pecho.', 'Espalda y cabeza apoyadas.'],
    technique: ['Empuja hacia arriba y adelante sin bloquear codos.', 'Vuelve despacio.'],
    errors: ['Arquear la zona lumbar para mover más peso.'],
  },
  {
    id: 'press-banca-multipower', name: 'Press de banca en multipower', aliases: ['smith', 'multipower', 'press smith'],
    equipment: 'machine', pattern: 'empuje_horizontal', primary: ['pecho'], secondary: ['deltoide_anterior', 'triceps'], met: UPPER, img: 'Smith_Machine_Bench_Press',
    setup: ['Coloca el banco para que la barra baje a la parte baja del pecho.', 'Agarre algo más ancho que los hombros.'],
    technique: ['Desbloquea girando la barra y baja controlado.', 'Empuja sin rebotar.'],
    errors: ['Banco mal colocado: la barra cae en el cuello o en el abdomen.'],
  },
  {
    id: 'contractor-pecho', name: 'Mariposa de pecho (contractor)', aliases: ['mariposas de pecho', 'mariposa', 'contractor de pecho', 'pec deck', 'contractor', 'aperturas maquina'],
    equipment: 'machine', pattern: 'aperturas', primary: ['pecho'], secondary: ['deltoide_anterior'], met: ISO, img: 'Butterfly',
    setup: ['Asiento con las asas a la altura del pecho.', 'Espalda pegada al respaldo, hombros atrás.'],
    technique: ['Junta las asas delante del pecho con los codos ligeramente flexionados.', 'Abre despacio hasta notar estiramiento, sin pasar de la línea del cuerpo.'],
    errors: ['Abrir demasiado y forzar el hombro.', 'Empujar con las manos en vez de con los brazos.'],
  },
  {
    id: 'cruce-poleas', name: 'Cruce de poleas', aliases: ['crossover', 'aperturas en polea'],
    equipment: 'cable', pattern: 'aperturas', primary: ['pecho'], secondary: ['deltoide_anterior'], met: ISO, img: 'Cable_Crossover',
    setup: ['Poleas altas, un paso adelante, un pie adelantado.', 'Tronco algo inclinado, pecho alto.'],
    technique: ['Lleva las manos hacia abajo y al centro en arco.', 'Vuelve despacio manteniendo los codos fijos.'],
    errors: ['Doblar y estirar los codos: se convierte en un press.'],
  },
  {
    id: 'aperturas-mancuernas', name: 'Aperturas con mancuernas', aliases: ['flyes', 'aperturas'],
    equipment: 'dumbbell', pattern: 'aperturas', primary: ['pecho'], secondary: ['deltoide_anterior'], met: ISO, img: 'Dumbbell_Flyes',
    setup: ['Tumbado en banco plano, mancuernas arriba con palmas enfrentadas.'],
    technique: ['Abre en arco con los codos algo flexionados.', 'Para al notar estiramiento y vuelve juntando.'],
    errors: ['Bajar demasiado con mucho peso.'],
  },
  {
    id: 'fondos', name: 'Fondos en paralelas', aliases: ['dips', 'fondos', 'fondos pecho'],
    equipment: 'bodyweight', pattern: 'fondos', primary: ['pecho', 'triceps'], secondary: ['deltoide_anterior'], met: UPPER, img: 'Dips_-_Chest_Version',
    setup: ['Sujétate en las paralelas con los brazos estirados.', 'Tronco algo inclinado hacia delante para más pecho.'],
    technique: ['Baja hasta que el codo llegue a unos 90°.', 'Sube empujando sin bloquear.'],
    errors: ['Bajar demasiado: carga el hombro.', 'Encoger los hombros hacia las orejas.'],
  },
  {
    id: 'fondos-asistidos', name: 'Fondos asistidos en máquina', aliases: ['fondos asistidos', 'dip asistido', 'dips maquina'],
    equipment: 'machine', pattern: 'fondos', primary: ['pecho', 'triceps'], secondary: ['deltoide_anterior'], met: UPPER, img: 'Dips_-_Triceps_Version',
    setup: ['Elige el contrapeso: más peso = más ayuda.', 'Rodillas en la plataforma, brazos estirados.'],
    technique: ['Baja hasta unos 90° de codo y sube controlado.'],
    errors: ['Usar tanta ayuda que no cuesta.'],
  },
  {
    id: 'flexiones', name: 'Flexiones', aliases: ['push ups', 'pushups', 'lagartijas'],
    equipment: 'bodyweight', pattern: 'empuje_horizontal', primary: ['pecho'], secondary: ['triceps', 'deltoide_anterior', 'abdominales'], met: UPPER, img: 'Pushups',
    setup: ['Manos algo más abiertas que los hombros.', 'Cuerpo en línea recta de cabeza a talones.'],
    technique: ['Baja el pecho casi al suelo con codos a 45°.', 'Empuja manteniendo el abdomen firme.'],
    errors: ['Hundir la cadera.'],
  },
  // ---------------- Espalda ----------------
  {
    id: 'jalon-pecho', name: 'Jalón al pecho', aliases: ['jalon al pecho', 'jalon', 'lat pulldown', 'lat machine', 'polea al pecho'],
    equipment: 'cable', pattern: 'tiron_vertical', primary: ['dorsal'], secondary: ['biceps', 'espalda_media', 'deltoide_posterior'], met: UPPER, img: 'Wide-Grip_Lat_Pulldown',
    setup: ['Ajusta el rodillo para que sujete bien los muslos.', 'Agarre algo más ancho que los hombros.'],
    technique: ['Saca el pecho y lleva la barra a la parte alta del pecho tirando con los codos.', 'Sube controlado hasta estirar los brazos.'],
    errors: ['Echarse muy atrás y tirar con el cuerpo.', 'Bajar la barra por detrás de la nuca.'],
  },
  {
    id: 'jalon-agarre-estrecho', name: 'Jalón con agarre estrecho', aliases: ['jalon estrecho', 'jalon triangulo', 'close grip pulldown'],
    equipment: 'cable', pattern: 'tiron_vertical', primary: ['dorsal'], secondary: ['biceps', 'espalda_media'], met: UPPER, img: 'Close-Grip_Front_Lat_Pulldown',
    setup: ['Agarre estrecho o triángulo, muslos sujetos.'],
    technique: ['Lleva el agarre al esternón con los codos pegados.', 'Sube estirando del todo.'],
    errors: ['Balancear el tronco.'],
  },
  {
    id: 'jalon-maquina', name: 'Pulldown en máquina (jalón de palanca)', aliases: ['pulldown', 'pull down', 'pulldown maquina', 'jalon maquina', 'jalon en maquina', 'high row', 'remo alto'],
    equipment: 'machine', pattern: 'tiron_vertical', primary: ['dorsal'], secondary: ['biceps', 'espalda_media'], met: UPPER, img: 'Leverage_High_Row',
    setup: ['Asiento con las asas al alcance con los brazos estirados.', 'Muslos sujetos bajo el rodillo.'],
    technique: ['Tira hacia abajo con los codos hacia las costillas.', 'Sube despacio.'],
    errors: ['Encoger los hombros al tirar.'],
  },
  {
    id: 'dominadas-asistidas', name: 'Dominadas asistidas', aliases: ['dominadas', 'pull ups', 'dominada asistida'],
    equipment: 'machine', pattern: 'tiron_vertical', primary: ['dorsal'], secondary: ['biceps', 'espalda_media'], met: UPPER, img: 'Pullups',
    setup: ['Elige el contrapeso: más peso = más ayuda.', 'Rodillas en la plataforma, agarre algo más ancho que los hombros.'],
    technique: ['Sube llevando el pecho a la barra.', 'Baja controlado hasta estirar.'],
    errors: ['Medio recorrido.'],
  },
  {
    id: 'remo-polea-baja', name: 'Remo en polea baja', aliases: ['remo gironda', 'remo sentado', 'seated row', 'remo polea'],
    equipment: 'cable', pattern: 'tiron_horizontal', primary: ['espalda_media', 'dorsal'], secondary: ['biceps', 'deltoide_posterior', 'trapecio'], met: UPPER, img: 'Seated_Cable_Rows',
    setup: ['Pies en la plataforma, rodillas algo flexionadas.', 'Espalda recta, pecho alto.'],
    technique: ['Tira llevando el agarre al abdomen y juntando escápulas.', 'Vuelve estirando los brazos sin redondear la espalda.'],
    errors: ['Balancear el tronco adelante y atrás.'],
  },
  {
    id: 'remo-maquina', name: 'Remo horizontal en máquina', aliases: ['remo horizontal', 'remo en maquina', 'remo maquina', 'row machine', 'remo con apoyo', 'remo horizontal maquina', 'seated row machine'],
    equipment: 'machine', pattern: 'tiron_horizontal', primary: ['espalda_media', 'dorsal'], secondary: ['biceps', 'deltoide_posterior'], met: UPPER, img: 'Leverage_Iso_Row',
    setup: ['Pecho apoyado en el soporte.', 'Asiento con las asas a la altura del pecho bajo.'],
    technique: ['Tira con los codos hacia atrás, junta escápulas.', 'Vuelve despacio.'],
    errors: ['Separar el pecho del soporte.'],
  },
  {
    id: 'remo-bajo-maquina', name: 'Remo bajo en máquina (low row)', aliases: ['low row', 'remo bajo', 'remo bajo maquina'],
    equipment: 'machine', pattern: 'tiron_horizontal', primary: ['dorsal', 'espalda_media'], secondary: ['biceps', 'deltoide_posterior'], met: UPPER, img: 'Seated_Cable_Rows',
    setup: ['Pecho contra el apoyo y pies firmes.', 'Asas por debajo de la altura del pecho, brazos estirados.'],
    technique: ['Tira de abajo hacia la cadera con los codos pegados.', 'Junta escápulas al final y vuelve despacio.'],
    errors: ['Encoger los hombros hacia las orejas.'],
  },
  {
    id: 'remo-t-apoyo', name: 'Remo en T con apoyo', aliases: ['remo en t', 'remo t', 't bar row', 'remo en t con apoyo de pecho'],
    equipment: 'machine', pattern: 'tiron_horizontal', primary: ['espalda_media', 'dorsal'], secondary: ['biceps', 'deltoide_posterior', 'trapecio'], met: UPPER, img: 'Lying_T-Bar_Row',
    setup: ['Pecho y abdomen sobre el apoyo inclinado.', 'Pies firmes en la plataforma.'],
    technique: ['Sube las asas llevando los codos atrás.', 'Baja hasta estirar sin perder el apoyo.'],
    errors: ['Despegar el pecho para dar tirón.'],
  },
  {
    id: 'remo-mancuerna', name: 'Remo con mancuerna a una mano', aliases: ['remo mancuerna', 'one arm row'],
    equipment: 'dumbbell', pattern: 'tiron_horizontal', primary: ['dorsal', 'espalda_media'], secondary: ['biceps', 'deltoide_posterior'], met: UPPER, img: 'One-Arm_Dumbbell_Row',
    setup: ['Rodilla y mano del mismo lado en el banco.', 'Espalda plana.'],
    technique: ['Lleva la mancuerna hacia la cadera.', 'Baja estirando el brazo.'],
    errors: ['Girar el tronco para subir el peso.'],
  },
  {
    id: 'remo-barra', name: 'Remo con barra', aliases: ['remo barra', 'bent over row'],
    equipment: 'barbell', pattern: 'tiron_horizontal', primary: ['espalda_media', 'dorsal'], secondary: ['biceps', 'lumbar', 'deltoide_posterior'], met: UPPER, img: 'Bent_Over_Barbell_Row',
    setup: ['Inclina el tronco a unos 45° con la espalda recta.', 'Rodillas algo flexionadas.'],
    technique: ['Lleva la barra al ombligo.', 'Baja controlado.'],
    errors: ['Redondear la espalda.'],
  },
  {
    id: 'pullover-polea', name: 'Pullover en polea (brazos rectos)', aliases: ['pullover', 'straight arm pulldown', 'jalon brazos rectos'],
    equipment: 'cable', pattern: 'pullover', primary: ['dorsal'], secondary: ['triceps'], met: ISO, img: 'Straight-Arm_Pulldown',
    setup: ['Polea alta con barra o cuerda.', 'Un paso atrás, tronco algo inclinado.'],
    technique: ['Baja la barra hasta los muslos con los brazos casi rectos.', 'Sube despacio hasta la altura de los ojos.'],
    errors: ['Doblar los codos.'],
  },
  {
    id: 'hiperextensiones', name: 'Hiperextensiones lumbares', aliases: ['hiperextensiones', 'extension lumbar', 'back extension'],
    equipment: 'bodyweight', pattern: 'lumbar', primary: ['lumbar'], secondary: ['gluteo', 'isquios'], met: CORE, img: 'Hyperextensions_Back_Extensions',
    setup: ['Cadera apoyada justo por encima del borde.', 'Tobillos sujetos.'],
    technique: ['Baja con la espalda recta y sube hasta alinear el cuerpo.'],
    errors: ['Subir de más arqueando la espalda.'],
  },
  {
    id: 'encogimientos-mancuernas', name: 'Encogimientos con mancuernas', aliases: ['encogimientos', 'shrugs'],
    equipment: 'dumbbell', pattern: 'encogimientos', primary: ['trapecio'], secondary: ['antebrazo'], met: ISO, img: 'Dumbbell_Shrug',
    setup: ['De pie, mancuernas a los lados.'],
    technique: ['Sube los hombros hacia las orejas, pausa y baja.'],
    errors: ['Girar los hombros en círculo.'],
  },
  // ---------------- Hombro ----------------
  {
    id: 'press-hombro-maquina', name: 'Press de hombro en máquina', aliases: ['press de hombro', 'press hombro', 'shoulder press', 'press militar maquina'],
    equipment: 'machine', pattern: 'empuje_vertical', primary: ['deltoide_anterior'], secondary: ['deltoide_lateral', 'triceps'], met: UPPER, img: 'Leverage_Shoulder_Press',
    setup: ['Asiento con las asas a la altura de los hombros.', 'Espalda apoyada.'],
    technique: ['Empuja hacia arriba sin bloquear codos.', 'Baja hasta la altura de las orejas.'],
    errors: ['Arquear la zona lumbar.'],
  },
  {
    id: 'press-hombro-mancuernas', name: 'Press de hombro con mancuernas', aliases: ['press militar mancuernas', 'dumbbell shoulder press'],
    equipment: 'dumbbell', pattern: 'empuje_vertical', primary: ['deltoide_anterior'], secondary: ['deltoide_lateral', 'triceps'], met: UPPER, img: 'Seated_Dumbbell_Press',
    setup: ['Sentado con respaldo vertical, mancuernas a la altura de los hombros.'],
    technique: ['Empuja hacia arriba acercándolas un poco.', 'Baja controlado.'],
    errors: ['Bajar demasiado con el codo por detrás del cuerpo.'],
  },
  {
    id: 'press-militar-barra', name: 'Press militar con barra', aliases: ['press militar', 'military press', 'overhead press'],
    equipment: 'barbell', pattern: 'empuje_vertical', primary: ['deltoide_anterior'], secondary: ['deltoide_lateral', 'triceps', 'abdominales'], met: UPPER, img: 'Standing_Military_Press',
    setup: ['De pie, barra en la parte alta del pecho, agarre a la anchura de los hombros.', 'Glúteos y abdomen apretados.'],
    technique: ['Empuja la barra en línea recta apartando la cara.', 'Baja controlado.'],
    errors: ['Echar la cadera adelante y arquear.'],
  },
  {
    id: 'elevaciones-laterales', name: 'Elevaciones laterales con mancuernas', aliases: ['elevaciones laterales', 'laterales', 'lateral raise'],
    equipment: 'dumbbell', pattern: 'elevacion_lateral', primary: ['deltoide_lateral'], secondary: ['trapecio'], met: ISO, img: 'Side_Lateral_Raise',
    setup: ['De pie, mancuernas a los lados, codos algo flexionados.'],
    technique: ['Sube los brazos hacia los lados hasta la altura de los hombros.', 'Baja despacio.'],
    errors: ['Balancear el cuerpo.', 'Subir por encima de los hombros encogiendo el trapecio.'],
  },
  {
    id: 'elevaciones-laterales-polea', name: 'Elevación lateral en polea', aliases: ['lateral polea', 'cable lateral raise'],
    equipment: 'cable', pattern: 'elevacion_lateral', primary: ['deltoide_lateral'], secondary: ['trapecio'], met: ISO, img: 'Cable_Seated_Lateral_Raise',
    setup: ['Polea baja, de lado a la máquina, agarre con la mano contraria.'],
    technique: ['Sube el brazo hacia el lado hasta la altura del hombro.', 'Baja despacio.'],
    errors: ['Inclinar el tronco para ayudarse.'],
  },
  {
    id: 'elevaciones-frontales', name: 'Elevaciones frontales', aliases: ['frontales', 'front raise'],
    equipment: 'dumbbell', pattern: 'elevacion_frontal', primary: ['deltoide_anterior'], secondary: ['pecho'], met: ISO, img: 'Front_Dumbbell_Raise',
    setup: ['De pie, mancuernas delante de los muslos.'],
    technique: ['Sube un brazo o los dos hasta la altura de los ojos.', 'Baja controlado.'],
    errors: ['Coger impulso con la espalda.'],
  },
  {
    id: 'contractor-inverso', name: 'Mariposa inversa (contractor inverso)', aliases: ['mariposas espalda', 'mariposa de espalda', 'contractor inverso', 'mariposa inversa', 'reverse fly', 'pajaros maquina', 'peck deck inverso'],
    equipment: 'machine', pattern: 'deltoide_posterior', primary: ['deltoide_posterior'], secondary: ['espalda_media', 'trapecio'], met: ISO, img: 'Reverse_Machine_Flyes',
    setup: ['Siéntate mirando al respaldo, pecho apoyado.', 'Asas a la altura de los hombros.'],
    technique: ['Abre los brazos hacia atrás con los codos algo flexionados.', 'Vuelve despacio.'],
    errors: ['Juntar las escápulas en exceso y tirar con la espalda.'],
  },
  {
    id: 'face-pull', name: 'Face pull', aliases: ['facepull', 'jalon a la cara'],
    equipment: 'cable', pattern: 'deltoide_posterior', primary: ['deltoide_posterior'], secondary: ['espalda_media', 'trapecio'], met: ISO, img: 'Face_Pull',
    setup: ['Polea a la altura de la cara con cuerda.'],
    technique: ['Tira de la cuerda hacia la cara separando las manos.', 'Codos altos, vuelve despacio.'],
    errors: ['Tirar con el cuerpo hacia atrás.'],
  },
  {
    id: 'pajaros-mancuernas', name: 'Pájaros con mancuernas', aliases: ['pajaros', 'rear delt fly'],
    equipment: 'dumbbell', pattern: 'deltoide_posterior', primary: ['deltoide_posterior'], secondary: ['espalda_media'], met: ISO, img: 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench',
    setup: ['Inclinado o con la frente apoyada en un banco inclinado.'],
    technique: ['Abre los brazos hacia los lados con codos algo flexionados.', 'Baja controlado.'],
    errors: ['Subir con impulso.'],
  },
  // ---------------- Brazos ----------------
  {
    id: 'curl-mancuernas', name: 'Curl de bíceps con mancuernas', aliases: ['curl de biceps', 'curl biceps', 'curl mancuernas', 'biceps'],
    equipment: 'dumbbell', pattern: 'curl', primary: ['biceps'], secondary: ['antebrazo'], met: ISO, img: 'Dumbbell_Bicep_Curl',
    setup: ['De pie, mancuernas a los lados, palmas al frente.', 'Codos pegados al cuerpo.'],
    technique: ['Flexiona los codos subiendo las mancuernas sin mover el codo.', 'Baja despacio hasta estirar.'],
    errors: ['Balancear el tronco.', 'Adelantar los codos.'],
  },
  {
    id: 'curl-barra', name: 'Curl con barra', aliases: ['curl barra', 'barbell curl', 'curl barra z'],
    equipment: 'barbell', pattern: 'curl', primary: ['biceps'], secondary: ['antebrazo'], met: ISO, img: 'Barbell_Curl',
    setup: ['De pie, agarre a la anchura de los hombros.'],
    technique: ['Sube la barra flexionando codos sin moverlos.', 'Baja controlado.'],
    errors: ['Usar la espalda para subir.'],
  },
  {
    id: 'curl-martillo', name: 'Curl martillo', aliases: ['martillo', 'hammer curl'],
    equipment: 'dumbbell', pattern: 'curl', primary: ['biceps', 'antebrazo'], secondary: [], met: ISO, img: 'Hammer_Curls',
    setup: ['Mancuernas con palmas enfrentadas.'],
    technique: ['Sube sin girar la muñeca y baja despacio.'],
    errors: ['Balancear.'],
  },
  {
    id: 'curl-maquina', name: 'Curl de bíceps en máquina', aliases: ['curl maquina', 'curl scott maquina', 'predicador maquina'],
    equipment: 'machine', pattern: 'curl', primary: ['biceps'], secondary: ['antebrazo'], met: ISO, img: 'Machine_Bicep_Curl',
    setup: ['Asiento con la parte de atrás del brazo apoyada en el soporte.', 'Codo alineado con el eje de la máquina.'],
    technique: ['Flexiona hasta arriba, baja hasta casi estirar.'],
    errors: ['Levantar el culo del asiento.'],
  },
  {
    id: 'curl-polea', name: 'Curl en polea', aliases: ['curl polea', 'cable curl'],
    equipment: 'cable', pattern: 'curl', primary: ['biceps'], secondary: ['antebrazo'], met: ISO, img: 'Standing_Biceps_Cable_Curl',
    setup: ['Polea baja con barra, de pie frente a la máquina.'],
    technique: ['Sube con los codos fijos, baja controlado.'],
    errors: ['Echarse hacia atrás.'],
  },
  {
    id: 'triceps-polea-cuerda', name: 'Extensión de tríceps en polea con cuerda', aliases: ['triceps polea', 'pushdown', 'triceps cuerda', 'jalon triceps'],
    equipment: 'cable', pattern: 'triceps', primary: ['triceps'], secondary: [], met: ISO, img: 'Triceps_Pushdown_-_Rope_Attachment',
    setup: ['Polea alta con cuerda, codos pegados al cuerpo.'],
    technique: ['Estira los codos abriendo la cuerda abajo.', 'Sube hasta 90° sin mover los codos.'],
    errors: ['Mover los hombros y los codos adelante.'],
  },
  {
    id: 'triceps-polea-barra', name: 'Extensión de tríceps en polea con barra', aliases: ['triceps barra polea', 'pushdown barra'],
    equipment: 'cable', pattern: 'triceps', primary: ['triceps'], secondary: [], met: ISO, img: 'Triceps_Pushdown',
    setup: ['Polea alta con barra recta o en V.'],
    technique: ['Codos fijos al costado, estira y vuelve a 90°.'],
    errors: ['Cargar el peso inclinándose encima.'],
  },
  {
    id: 'triceps-por-encima', name: 'Extensión de tríceps por encima de la cabeza (polea)', aliases: ['triceps frances polea', 'overhead extension'],
    equipment: 'cable', pattern: 'triceps', primary: ['triceps'], secondary: [], met: ISO, img: 'Cable_Rope_Overhead_Triceps_Extension',
    setup: ['De espaldas a la polea con la cuerda detrás de la cabeza.'],
    technique: ['Estira los codos hacia delante y arriba.', 'Vuelve despacio.'],
    errors: ['Abrir mucho los codos.'],
  },
  {
    id: 'triceps-maquina', name: 'Extensión de tríceps en máquina', aliases: ['triceps maquina', 'fondos maquina sentado'],
    equipment: 'machine', pattern: 'triceps', primary: ['triceps'], secondary: [], met: ISO, img: 'Machine_Triceps_Extension',
    setup: ['Codos apoyados y alineados con el eje.'],
    technique: ['Estira los codos y vuelve despacio.'],
    errors: ['Levantar los codos del apoyo.'],
  },
  {
    id: 'press-frances', name: 'Press francés', aliases: ['frances', 'skull crusher', 'lying triceps'],
    equipment: 'barbell', pattern: 'triceps', primary: ['triceps'], secondary: [], met: ISO, img: 'Lying_Triceps_Press',
    setup: ['Tumbado, barra Z sobre la cara con los brazos estirados.'],
    technique: ['Baja la barra hacia la frente doblando solo los codos.', 'Estira de nuevo.'],
    errors: ['Mover los hombros.'],
  },
  // ---------------- Pierna ----------------
  {
    id: 'prensa', name: 'Prensa de piernas', aliases: ['prensa pierna', 'prensa', 'leg press', 'prensa inclinada'],
    equipment: 'machine', pattern: 'prensa', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'aductores'], met: BIG, img: 'Leg_Press',
    setup: ['Espalda y cadera pegadas al respaldo.', 'Pies a la anchura de la cadera en el centro de la plataforma.'],
    technique: ['Baja hasta que las rodillas lleguen a unos 90°.', 'Empuja con todo el pie sin bloquear las rodillas.', 'Rodillas en la dirección de los pies.'],
    errors: ['Bajar tanto que la cadera se despega.', 'Rodillas hacia dentro.'],
  },
  {
    id: 'sentadilla-hack', name: 'Sentadilla hack', aliases: ['hack', 'hack squat'],
    equipment: 'machine', pattern: 'sentadilla', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'aductores'], met: BIG, img: 'Hack_Squat',
    setup: ['Hombros bajo las almohadillas, espalda apoyada.', 'Pies a la anchura de la cadera.'],
    technique: ['Baja controlado hasta donde mantengas la espalda apoyada.', 'Sube empujando con todo el pie.'],
    errors: ['Despegar los talones.'],
  },
  {
    id: 'sentadilla-multipower', name: 'Sentadilla en multipower', aliases: ['sentadilla smith'],
    equipment: 'machine', pattern: 'sentadilla', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'lumbar'], met: BIG, img: 'Smith_Machine_Squat',
    setup: ['Barra sobre los trapecios, pies algo adelantados.'],
    technique: ['Baja con el pecho alto y sube empujando.'],
    errors: ['Pies muy atrás: carga la rodilla.'],
  },
  {
    id: 'sentadilla-barra', name: 'Sentadilla con barra', aliases: ['sentadilla', 'squat', 'back squat'],
    equipment: 'barbell', pattern: 'sentadilla', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'lumbar', 'aductores'], met: BIG, img: 'Barbell_Squat',
    setup: ['Barra sobre los trapecios, pies a la anchura de los hombros.', 'Abdomen apretado.'],
    technique: ['Baja como sentándote atrás con el pecho alto.', 'Sube empujando el suelo.'],
    errors: ['Rodillas hacia dentro.', 'Redondear la espalda abajo.'],
  },
  {
    id: 'sentadilla-goblet', name: 'Sentadilla goblet', aliases: ['goblet', 'sentadilla copa'],
    equipment: 'dumbbell', pattern: 'sentadilla', primary: ['cuadriceps', 'gluteo'], secondary: ['abdominales'], met: BIG, img: 'Goblet_Squat',
    setup: ['Mancuerna vertical pegada al pecho.'],
    technique: ['Baja entre las rodillas con el pecho alto y sube.'],
    errors: ['Inclinar el tronco adelante.'],
  },
  {
    id: 'extension-cuadriceps', name: 'Extensión de cuádriceps', aliases: ['leg extension', 'extension de piernas', 'extensiones', 'cuadriceps maquina'],
    equipment: 'machine', pattern: 'extension_rodilla', primary: ['cuadriceps'], secondary: [], met: ISO, img: 'Leg_Extensions',
    setup: ['Rodilla alineada con el eje de la máquina.', 'Rodillo apoyado sobre el tobillo.'],
    technique: ['Estira las piernas, pausa arriba, baja despacio.'],
    errors: ['Dar golpes arriba.'],
  },
  {
    id: 'curl-femoral-tumbado', name: 'Curl femoral tumbado', aliases: ['femoral tumbado', 'leg curl', 'curl femoral'],
    equipment: 'machine', pattern: 'curl_femoral', primary: ['isquios'], secondary: ['gemelos'], met: ISO, img: 'Lying_Leg_Curls',
    setup: ['Boca abajo, rodilla justo fuera del banco.', 'Rodillo sobre el tobillo.'],
    technique: ['Flexiona llevando los talones al glúteo.', 'Baja despacio.'],
    errors: ['Levantar la cadera del banco.'],
  },
  {
    id: 'curl-femoral-sentado', name: 'Curl femoral sentado', aliases: ['femoral sentado', 'seated leg curl'],
    equipment: 'machine', pattern: 'curl_femoral', primary: ['isquios'], secondary: ['gemelos'], met: ISO, img: 'Seated_Leg_Curl',
    setup: ['Rodilla alineada con el eje, muslos sujetos.'],
    technique: ['Flexiona hacia abajo y atrás, vuelve despacio.'],
    errors: ['Rodillo demasiado alto en la pierna.'],
  },
  {
    id: 'peso-muerto-rumano', name: 'Peso muerto rumano', aliases: ['rumano', 'romanian deadlift', 'peso muerto piernas rigidas'],
    equipment: 'barbell', pattern: 'bisagra', primary: ['isquios', 'gluteo'], secondary: ['lumbar', 'antebrazo'], met: BIG, img: 'Romanian_Deadlift',
    setup: ['De pie con la barra en las manos, rodillas algo flexionadas.'],
    technique: ['Echa la cadera atrás bajando la barra pegada a las piernas.', 'Para al notar estiramiento detrás de los muslos y sube.'],
    errors: ['Redondear la espalda.'],
  },
  {
    id: 'peso-muerto-rumano-mancuernas', name: 'Peso muerto rumano con mancuernas', aliases: ['rumano mancuernas', 'stiff legged dumbbell'],
    equipment: 'dumbbell', pattern: 'bisagra', primary: ['isquios', 'gluteo'], secondary: ['lumbar'], met: BIG, img: 'Stiff-Legged_Dumbbell_Deadlift',
    setup: ['Mancuernas delante de los muslos, rodillas algo flexionadas.'],
    technique: ['Cadera atrás con la espalda recta y vuelve.'],
    errors: ['Bajar las mancuernas lejos del cuerpo.'],
  },
  {
    id: 'peso-muerto', name: 'Peso muerto', aliases: ['deadlift', 'peso muerto convencional'],
    equipment: 'barbell', pattern: 'bisagra', primary: ['gluteo', 'isquios', 'lumbar'], secondary: ['cuadriceps', 'trapecio', 'antebrazo'], met: BIG, img: 'Barbell_Deadlift',
    setup: ['Barra sobre la mitad del pie, agarre justo fuera de las piernas.', 'Espalda recta, pecho alto.'],
    technique: ['Empuja el suelo y extiende cadera y rodillas a la vez.', 'Baja con la barra pegada a las piernas.'],
    errors: ['Redondear la espalda.'],
  },
  {
    id: 'zancadas', name: 'Zancadas con mancuernas', aliases: ['zancadas', 'lunges', 'estocadas'],
    equipment: 'dumbbell', pattern: 'zancada', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'aductores'], met: BIG, img: 'Dumbbell_Lunges',
    setup: ['De pie con una mancuerna en cada mano.'],
    technique: ['Da un paso largo y baja hasta que la rodilla de atrás casi toque el suelo.', 'Empuja con el pie de delante para volver.'],
    errors: ['Rodilla delantera hacia dentro.'],
  },
  {
    id: 'sentadilla-bulgara', name: 'Sentadilla búlgara', aliases: ['bulgara', 'split squat'],
    equipment: 'dumbbell', pattern: 'zancada', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios'], met: BIG, img: 'Split_Squat_with_Dumbbells',
    setup: ['Empeine de atrás sobre un banco, pie de delante adelantado.'],
    technique: ['Baja recto y sube empujando con la pierna de delante.'],
    errors: ['Pie delantero demasiado cerca del banco.'],
  },
  {
    id: 'subidas-banco', name: 'Subidas al banco', aliases: ['step up', 'subidas cajon'],
    equipment: 'dumbbell', pattern: 'zancada', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios'], met: BIG, img: 'Dumbbell_Step_Ups',
    setup: ['Banco o cajón a la altura de la rodilla o algo menos.'],
    technique: ['Sube empujando con el pie de arriba y baja controlado.'],
    errors: ['Impulsarse con la pierna de abajo.'],
  },
  {
    id: 'hip-thrust', name: 'Hip thrust', aliases: ['hip thrust', 'empuje de cadera'],
    equipment: 'barbell', pattern: 'gluteo', primary: ['gluteo'], secondary: ['isquios'], met: UPPER, img: 'Barbell_Hip_Thrust',
    setup: ['Espalda alta apoyada en el banco, barra sobre la cadera con protector.', 'Pies a la anchura de la cadera.'],
    technique: ['Sube la cadera hasta alinear tronco y muslos, aprieta glúteos.', 'Baja controlado.'],
    errors: ['Arquear la zona lumbar arriba.'],
  },
  {
    id: 'patada-gluteo-polea', name: 'Patada de glúteo en polea', aliases: ['patada gluteo', 'kickback', 'gluteo polea'],
    equipment: 'cable', pattern: 'gluteo', primary: ['gluteo'], secondary: ['isquios'], met: ISO, img: 'Glute_Kickback',
    setup: ['Tobillera en la polea baja, agarrado a la máquina.'],
    technique: ['Lleva la pierna atrás sin arquear la espalda.', 'Vuelve despacio.'],
    errors: ['Girar la cadera.'],
  },
  {
    id: 'aductores-maquina', name: 'Aductores en máquina', aliases: ['aductores', 'adductor', 'cierre de piernas'],
    equipment: 'machine', pattern: 'aductor', primary: ['aductores'], secondary: [], met: ISO, img: 'Thigh_Adductor',
    setup: ['Espalda apoyada, almohadillas por dentro de las rodillas.'],
    technique: ['Cierra las piernas y abre despacio.'],
    errors: ['Abrir más de lo cómodo.'],
  },
  {
    id: 'abductores-maquina', name: 'Abductores en máquina', aliases: ['abductores', 'abductor', 'apertura de piernas'],
    equipment: 'machine', pattern: 'abductor', primary: ['abductores'], secondary: ['gluteo'], met: ISO, img: 'Thigh_Abductor',
    setup: ['Espalda apoyada, almohadillas por fuera de las rodillas.'],
    technique: ['Abre las piernas y cierra despacio.'],
    errors: ['Rebotar al cerrar.'],
  },
  {
    id: 'gemelos-de-pie', name: 'Gemelos de pie en máquina', aliases: ['gemelos', 'calf raise', 'elevacion de talones'],
    equipment: 'machine', pattern: 'gemelo', primary: ['gemelos'], secondary: [], met: ISO, img: 'Standing_Calf_Raises',
    setup: ['Hombros bajo las almohadillas, punta del pie en el borde.'],
    technique: ['Sube de puntillas al máximo, baja hasta estirar.'],
    errors: ['Rebotar abajo.'],
  },
  {
    id: 'gemelos-prensa', name: 'Gemelos en prensa', aliases: ['gemelos prensa', 'calf press'],
    equipment: 'machine', pattern: 'gemelo', primary: ['gemelos'], secondary: [], met: ISO, img: 'Calf_Press_On_The_Leg_Press_Machine',
    setup: ['Puntas de los pies en el borde bajo de la plataforma, piernas casi estiradas.'],
    technique: ['Empuja con las puntas y vuelve despacio.'],
    errors: ['Doblar las rodillas.'],
  },
  {
    id: 'gemelos-sentado', name: 'Gemelos sentado', aliases: ['soleo', 'seated calf'],
    equipment: 'machine', pattern: 'gemelo', primary: ['gemelos'], secondary: [], met: ISO, img: 'Seated_Calf_Raise',
    setup: ['Almohadilla sobre los muslos, punta del pie en el borde.'],
    technique: ['Sube los talones al máximo y baja despacio.'],
    errors: ['Medio recorrido.'],
  },
  // ---------------- Core ----------------
  {
    id: 'crunch-maquina', name: 'Crunch abdominal en máquina', aliases: ['abdominales maquina', 'crunch maquina', 'ab crunch'],
    equipment: 'machine', pattern: 'core_flexion', primary: ['abdominales'], secondary: [], met: CORE, img: 'Ab_Crunch_Machine',
    setup: ['Ajusta el asiento para que las asas queden junto al pecho.'],
    technique: ['Enrolla el tronco hacia las rodillas y vuelve despacio.'],
    errors: ['Tirar con los brazos.'],
  },
  {
    id: 'crunch-polea', name: 'Crunch en polea', aliases: ['crunch polea', 'cable crunch'],
    equipment: 'cable', pattern: 'core_flexion', primary: ['abdominales'], secondary: ['oblicuos'], met: CORE, img: 'Cable_Crunch',
    setup: ['De rodillas frente a la polea alta, cuerda junto a la cabeza.'],
    technique: ['Enrolla el tronco llevando los codos a las rodillas.', 'Sube despacio.'],
    errors: ['Mover la cadera en vez del tronco.'],
  },
  {
    id: 'crunch', name: 'Crunch en suelo', aliases: ['abdominales', 'crunch'],
    equipment: 'bodyweight', pattern: 'core_flexion', primary: ['abdominales'], secondary: [], met: CORE, img: 'Crunches',
    setup: ['Tumbado, rodillas flexionadas, manos junto a la cabeza.'],
    technique: ['Despega los hombros del suelo enrollando el tronco.', 'Baja despacio.'],
    errors: ['Tirar del cuello con las manos.'],
  },
  {
    id: 'plancha', name: 'Plancha', aliases: ['plank', 'plancha frontal'],
    equipment: 'bodyweight', pattern: 'core_estabilidad', primary: ['abdominales'], secondary: ['oblicuos', 'deltoide_anterior'], met: CORE, img: 'Plank',
    setup: ['Antebrazos en el suelo, codos bajo los hombros.'],
    technique: ['Cuerpo en línea recta, glúteos y abdomen apretados.', 'Registra los segundos como repeticiones.'],
    errors: ['Hundir o subir la cadera.'],
  },
  {
    id: 'plancha-lateral', name: 'Plancha lateral', aliases: ['side plank'],
    equipment: 'bodyweight', pattern: 'core_estabilidad', primary: ['oblicuos'], secondary: ['abdominales', 'abductores'], met: CORE, img: 'Side_Bridge',
    setup: ['De lado, apoyado en un antebrazo.'],
    technique: ['Sube la cadera y mantén el cuerpo recto.'],
    errors: ['Dejar caer la cadera.'],
  },
  {
    id: 'pallof', name: 'Press Pallof', aliases: ['pallof', 'antirrotacion'],
    equipment: 'cable', pattern: 'core_estabilidad', primary: ['oblicuos'], secondary: ['abdominales'], met: CORE, img: 'Pallof_Press',
    setup: ['De lado a la polea a la altura del pecho, agarre junto al esternón.'],
    technique: ['Estira los brazos al frente sin dejar que el tronco gire.', 'Vuelve al pecho.'],
    errors: ['Rotar el cuerpo hacia la polea.'],
  },
  {
    id: 'dead-bug', name: 'Dead bug', aliases: ['bicho muerto'],
    equipment: 'bodyweight', pattern: 'core_estabilidad', primary: ['abdominales'], secondary: [], met: CORE, img: 'Dead_Bug',
    setup: ['Boca arriba, brazos al techo, rodillas a 90°.'],
    technique: ['Estira brazo y pierna contrarios sin despegar la lumbar del suelo.', 'Alterna.'],
    errors: ['Arquear la espalda.'],
  },
  {
    id: 'elevacion-piernas', name: 'Elevación de piernas', aliases: ['leg raise', 'elevaciones piernas'],
    equipment: 'bodyweight', pattern: 'core_flexion', primary: ['abdominales'], secondary: [], met: CORE, img: 'Flat_Bench_Lying_Leg_Raise',
    setup: ['Tumbado en un banco, agarrado por detrás de la cabeza.'],
    technique: ['Sube las piernas hasta la vertical y baja sin tocar el banco.'],
    errors: ['Arquear la lumbar al bajar.'],
  },
  // ---------------- Cardio ----------------
  {
    id: 'cinta', name: 'Cinta de correr', aliases: ['cinta', 'treadmill', 'correr', 'caminar'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'treadmill', primary: ['cuadriceps'], secondary: ['gluteo', 'isquios', 'gemelos'], met: 5, img: 'Jogging_Treadmill',
    setup: ['Engancha la pinza de seguridad a la ropa.', 'Empieza a velocidad baja y súbela poco a poco.'],
    technique: ['Paso natural, mirada al frente.', 'Con inclinación, no te agarres a las barras.'],
    errors: ['Agarrarse a la máquina: falsea el esfuerzo.'],
  },
  {
    id: 'bicicleta', name: 'Bicicleta estática', aliases: ['bicicleta', 'bici', 'bike', 'bicicleta calentamiento', 'spinning'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'bike', primary: ['cuadriceps'], secondary: ['gluteo', 'isquios', 'gemelos'], met: 6.8, img: 'Bicycling_Stationary',
    setup: ['Sillín a la altura de la cadera de pie.', 'Con el pedal abajo, la rodilla queda casi estirada.'],
    technique: ['Pedalea con cadencia regular, tronco quieto.'],
    errors: ['Sillín bajo: carga la rodilla.'],
  },
  {
    id: 'bicicleta-reclinada', name: 'Bicicleta reclinada', aliases: ['reclinada', 'recumbent'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'bike', primary: ['cuadriceps'], secondary: ['gluteo', 'isquios'], met: 5.5, img: 'Recumbent_Bike',
    setup: ['Ajusta el asiento para que la rodilla quede casi estirada con el pedal lejos.'],
    technique: ['Espalda apoyada, pedaleo regular.'],
    errors: ['Asiento demasiado cerca.'],
  },
  {
    id: 'eliptica', name: 'Elíptica', aliases: ['eliptica', 'elliptical'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'elliptical', primary: ['cuadriceps'], secondary: ['gluteo', 'isquios', 'gemelos'], met: 5, img: 'Elliptical_Trainer',
    setup: ['Pies centrados en los pedales, manos en las asas móviles.'],
    technique: ['Movimiento fluido empujando y tirando con los brazos.'],
    errors: ['Apoyar todo el peso en las puntas.'],
  },
  {
    id: 'remo-ergometro', name: 'Remo (ergómetro)', aliases: ['remo maquina cardio', 'rower', 'ergometro'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'rower', primary: ['espalda_media', 'cuadriceps'], secondary: ['dorsal', 'biceps', 'gluteo', 'isquios'], met: 7, img: 'Rowing_Stationary',
    setup: ['Pies atados, cinta sobre la parte ancha del pie.'],
    technique: ['Empuja con piernas, luego inclina el tronco y tira con brazos.', 'Vuelve en orden inverso.'],
    errors: ['Tirar con los brazos antes que con las piernas.'],
  },
  {
    id: 'escaladora', name: 'Escaladora', aliases: ['stairmaster', 'escaleras', 'stepper'],
    equipment: 'cardio', pattern: 'cardio', cardio: 'stairs', primary: ['cuadriceps', 'gluteo'], secondary: ['isquios', 'gemelos'], met: 8.8, img: 'Stairmaster',
    setup: ['Agarre suave en las barras solo para equilibrio.'],
    technique: ['Pisa con todo el pie, tronco erguido.'],
    errors: ['Apoyarse en las barras con todo el peso.'],
  },
];
