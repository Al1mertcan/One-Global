// ONE Global — çok dilli (21 dil) metin katmanı.
// [data-i18n] ve [data-i18n-placeholder] etiketli öğelerin metnini seçilen
// dile göre değiştirir. Tercih tarayıcıda (localStorage) saklanır. Sağdan
// sola yazılan diller (Arapça, Urduca) için <html dir="rtl"> otomatik ayarlanır
// — bu ilk sürümde sadece metin yönünü kapsar, ikon/kart düzeninin tam
// aynalanması (deep RTL mirroring) ayrı bir iş olarak bırakıldı.
(function (global) {
  'use strict';

  var LANGUAGES = [
    { code: 'tr', name: 'Türkçe', dir: 'ltr' },
    { code: 'en', name: 'English', dir: 'ltr' },
    { code: 'es', name: 'Español', dir: 'ltr' },
    { code: 'fr', name: 'Français', dir: 'ltr' },
    { code: 'de', name: 'Deutsch', dir: 'ltr' },
    { code: 'pt', name: 'Português', dir: 'ltr' },
    { code: 'it', name: 'Italiano', dir: 'ltr' },
    { code: 'ru', name: 'Русский', dir: 'ltr' },
    { code: 'ar', name: 'العربية', dir: 'rtl' },
    { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
    { code: 'bn', name: 'বাংলা', dir: 'ltr' },
    { code: 'zh', name: '中文', dir: 'ltr' },
    { code: 'ja', name: '日本語', dir: 'ltr' },
    { code: 'ko', name: '한국어', dir: 'ltr' },
    { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
    { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
    { code: 'th', name: 'ไทย', dir: 'ltr' },
    { code: 'ur', name: 'اردو', dir: 'rtl' },
    { code: 'sw', name: 'Kiswahili', dir: 'ltr' },
    { code: 'pl', name: 'Polski', dir: 'ltr' },
    { code: 'nl', name: 'Nederlands', dir: 'ltr' },
  ];

  var STRINGS = {
    tr: {
      kicker: 'Komuta zekân', greeting: 'Günaydın', statusReady: 'Tüm sistemler hazır',
      encrypted: 'Uçtan uca şifreli', planPill: "ONE Global Plan · Türkiye'de ayda 10 TL", orbReady: 'Hazır',
      orbSub: 'Seni dinliyor · bağlamın güncel', statDevices: 'Bağlı cihaz', statMemory: 'Bellek güncellemesi',
      statDone: 'Bugün tamamlandı', nowLabel: 'Şu anda', live: 'Canlı', nowTask: 'Haftalık planı hazırlıyor',
      commandTitle: 'Komut ver', commandSub: 'ONE Global ne yapacağını anlar ve sınırlarını sana gösterir.',
      commandPlaceholder: 'Örneğin: Yarınki toplantıya hazırlan...', tabAssistant: 'Asistan',
      tabAutomations: 'Otomasyonlar', tabMemory: 'Bellek', tabDevices: 'Cihazlar', planTitle: 'ONE Global Plan',
      planBack: "Asistan'a dön", planHeadline: "Türkiye'de ayda sadece 10 TL",
      planSub: "ONE Global, Türkiye'de ayda sadece 10 TL — dünyanın geri kalanında ise yaşadığın ülke ne olursa olsun yerel para biriminin sadece 1 birimi kadardır.",
      planCurrencyLabel: 'Para birimini seç', planCurrencyAuto: 'Yerel para birimini otomatik seçtik — istersen değiştirebilirsin.',
      planFeaturesTitle: 'Plana dahil olanlar', planFeature1: 'Sınırsız sohbet ve görev yönetimi',
      planFeature2: 'Otomasyonlar ve hatırlatmalar', planFeature3: 'Cihazlar arası senkronizasyon',
      planFeature4: 'Öncelikli destek', planMissionTitle: 'Yakında: paylaşım döngüsü',
      planMissionBody: 'Vizyonumuz, abonelik gelirinin büyük bir kısmını doğrudan ihtiyaç sahipleriyle paylaşmak. Bu özellik henüz aktif değil — yasal ve finansal altyapı kurulduğunda burada duyurulacak.',
      planCta: 'Abone ol', planDemoNote: 'Bu bir tasarım önizlemesidir — henüz gerçek ödeme alınmıyor.', langLabel: 'Dil', goodNewsTitle: 'Bugünün iyi haberleri', goodNewsSubtitle: 'Dünyadan gerçek, güzel gelişmeler — yüzün gülsün diye.', goodNewsLoading: 'Yükleniyor…', goodNewsError: 'Şu an iyi haberler yüklenemedi — az sonra tekrar dene.', onboardHeadline: 'Şu anki ve gelecekteki seni düşünen, iyi hissettirecek tek uygulama', onboardTrial: "İlk 1 hafta ücretsiz, sonrasında Türkiye'de ayda 10 TL (diğer ülkelerde yerel para biriminin 1 birimi).", onboardCta: 'Ücretsiz Başla', onboardNote: 'İstediğin zaman iptal edebilirsin.', memberCountTitle: 'ONE Global ailesi', memberCountLoading: 'Yükleniyor…', memberCountGoalText: "1 milyona ulaştığımızda, her ay gelirin %90'ı ihtiyaç sahipleriyle paylaşılmaya başlayacak.", memberCountActiveText: "Şu an her ay gelirin %90'ı ihtiyaç sahipleriyle paylaşılıyor. Sıradaki hedefimiz: 1 milyar üye.", planTrialBadge: 'İlk 1 hafta ücretsiz', planTrialLine: 'İlk 1 hafta ücretsiz. Sonrasında istediğin zaman iptal edebilirsin.', quickStartTitle: "Hızlı başlangıç", quickStartSub: "Şu an gerçekten yapabildiklerin", quickStartChatTitle: "ONE Global'a bir şey sor", quickStartChatDesc: "Aşağıdaki kutuya yaz, gerçek bir yapay zeka sohbeti başlasın.", quickStartRoutineTitle: "Günlük rutinini ayarla", quickStartRoutineDesc: "Uyanma, ev, uyku saatlerine göre gerçek bildirimler al.", quickStartGo: "Başlat", devicesPreviewTitle: "Cihaz kontrolü", devicesPreviewSub: "Henüz yok — dürüstçe açıklıyoruz", devicesPreviewCardTitle: "ONE Global henüz cihazlarını kontrol edemiyor", devicesPreviewCardDesc: "Detaylar ve yol haritası için dokun",
    },
    en: {
      kicker: 'Command intelligence', greeting: 'Hello', statusReady: 'All systems ready',
      encrypted: 'End-to-end encrypted', planPill: 'ONE Global Plan · Just 1 unit a month', orbReady: 'Ready',
      orbSub: 'Listening · context up to date', statDevices: 'Connected devices', statMemory: 'Memory updates',
      statDone: 'Done today', nowLabel: 'Right now', live: 'Live', nowTask: 'Preparing your weekly plan',
      commandTitle: 'Give a command', commandSub: 'ONE Global understands what to do and shows you its limits.',
      commandPlaceholder: "e.g. Get me ready for tomorrow's meeting...", tabAssistant: 'Assistant',
      tabAutomations: 'Automations', tabMemory: 'Memory', tabDevices: 'Devices', planTitle: 'ONE Global Plan',
      planBack: 'Back to Assistant', planHeadline: 'Just 1 unit a month, anywhere in the world',
      planSub: 'No matter where you live, ONE Global always costs just 1 unit of your local currency — genuinely accessible for everyone.',
      planCurrencyLabel: 'Choose your currency', planCurrencyAuto: 'We auto-detected your local currency — feel free to change it.',
      planFeaturesTitle: "What's included", planFeature1: 'Unlimited chat and task management',
      planFeature2: 'Automations and reminders', planFeature3: 'Sync across devices', planFeature4: 'Priority support',
      planMissionTitle: 'Coming soon: the sharing loop',
      planMissionBody: 'Our vision is to share a large share of subscription revenue directly with people in need. This feature is not active yet — it will be announced here once the legal and financial groundwork is in place.',
      planCta: 'Subscribe', planDemoNote: 'This is a design preview — no real payment is being taken yet.', langLabel: 'Language', goodNewsTitle: 'Today\'s good news', goodNewsSubtitle: 'Real, uplifting developments from around the world — to bring a smile to your face.', goodNewsLoading: 'Loading…', goodNewsError: 'Couldn\'t load good news right now — try again in a bit.', onboardHeadline: "The only app that thinks of who you are now and who you'll be — made to make you feel good.", onboardTrial: 'Free for your first week, then just 1 unit of your own currency a month.', onboardCta: 'Start Free', onboardNote: 'Cancel anytime.', memberCountTitle: 'The ONE Global family', memberCountLoading: 'Loading…', memberCountGoalText: 'When we reach 1 million members, 90% of monthly revenue will start being shared with people in need.', memberCountActiveText: 'Right now, 90% of monthly revenue is being shared with people in need. Our next goal: 1 billion members.', planTrialBadge: 'First week free', planTrialLine: 'Free for the first week. Cancel anytime after that.', quickStartTitle: "Quick start", quickStartSub: "What you can really do right now", quickStartChatTitle: "Ask ONE Global something", quickStartChatDesc: "Type in the box below to start a real AI conversation.", quickStartRoutineTitle: "Set up your daily routine", quickStartRoutineDesc: "Get real notifications based on your wake, home, and sleep times.", quickStartGo: "Start", devicesPreviewTitle: "Device control", devicesPreviewSub: "Not yet — we're upfront about it", devicesPreviewCardTitle: "ONE Global can't control your devices yet", devicesPreviewCardDesc: "Tap for details and the roadmap",
    },
    es: {
      kicker: 'Inteligencia de mando', greeting: 'Hola', statusReady: 'Todos los sistemas listos',
      encrypted: 'Cifrado de extremo a extremo', planPill: 'Plan ONE Global · Solo 1 unidad al mes', orbReady: 'Listo',
      orbSub: 'Escuchando · contexto actualizado', statDevices: 'Dispositivos conectados', statMemory: 'Actualizaciones de memoria',
      statDone: 'Completado hoy', nowLabel: 'Ahora mismo', live: 'En vivo', nowTask: 'Preparando tu plan semanal',
      commandTitle: 'Da una instrucción', commandSub: 'ONE Global entiende qué hacer y te muestra sus límites.',
      commandPlaceholder: 'Por ejemplo: Prepárame para la reunión de mañana...', tabAssistant: 'Asistente',
      tabAutomations: 'Automatizaciones', tabMemory: 'Memoria', tabDevices: 'Dispositivos', planTitle: 'Plan ONE Global',
      planBack: 'Volver al Asistente', planHeadline: 'Solo 1 unidad al mes, en cualquier parte del mundo',
      planSub: 'Sin importar dónde vivas, ONE Global siempre cuesta solo 1 unidad de tu moneda local — realmente accesible para todos.',
      planCurrencyLabel: 'Elige tu moneda', planCurrencyAuto: 'Detectamos automáticamente tu moneda local — puedes cambiarla si quieres.',
      planFeaturesTitle: 'Qué incluye', planFeature1: 'Chat y gestión de tareas ilimitados',
      planFeature2: 'Automatizaciones y recordatorios', planFeature3: 'Sincronización entre dispositivos', planFeature4: 'Soporte prioritario',
      planMissionTitle: 'Próximamente: el ciclo de reparto',
      planMissionBody: 'Nuestra visión es compartir una gran parte de los ingresos por suscripción directamente con quienes lo necesitan. Esta función aún no está activa — se anunciará aquí cuando esté lista la base legal y financiera.',
      planCta: 'Suscribirse', planDemoNote: 'Esta es una vista previa de diseño — todavía no se realiza ningún cobro real.', langLabel: 'Idioma', goodNewsTitle: 'Las buenas noticias de hoy', goodNewsSubtitle: 'Novedades reales y alentadoras de todo el mundo — para sacarte una sonrisa.', goodNewsLoading: 'Cargando…', goodNewsError: 'No se pudieron cargar las buenas noticias — inténtalo de nuevo en un momento.', onboardHeadline: 'La única app que piensa en quién eres ahora y en quién serás — hecha para hacerte sentir bien.', onboardTrial: 'Gratis tu primera semana, luego solo 1 unidad de tu propia moneda al mes.', onboardCta: 'Empezar gratis', onboardNote: 'Cancela cuando quieras.', memberCountTitle: 'La familia ONE Global', memberCountLoading: 'Cargando…', memberCountGoalText: 'Cuando lleguemos a 1 millón de miembros, el 90% de los ingresos mensuales empezará a compartirse con personas necesitadas.', memberCountActiveText: 'Ahora mismo, el 90% de los ingresos mensuales se comparte con personas necesitadas. Nuestra próxima meta: 1.000 millones de miembros.', planTrialBadge: 'Primera semana gratis', planTrialLine: 'Gratis la primera semana. Cancela cuando quieras después.', quickStartTitle: "Inicio rápido", quickStartSub: "Lo que realmente puedes hacer ahora mismo", quickStartChatTitle: "Pregúntale algo a ONE Global", quickStartChatDesc: "Escribe en el cuadro de abajo para iniciar una conversación real con la IA.", quickStartRoutineTitle: "Configura tu rutina diaria", quickStartRoutineDesc: "Recibe notificaciones reales según tus horarios de despertar, casa y dormir.", quickStartGo: "Empezar", devicesPreviewTitle: "Control de dispositivos", devicesPreviewSub: "Todavía no — te lo decimos con honestidad", devicesPreviewCardTitle: "ONE Global todavía no puede controlar tus dispositivos", devicesPreviewCardDesc: "Toca para ver detalles y la hoja de ruta",
    },
    fr: {
      kicker: 'Intelligence de commande', greeting: 'Bonjour', statusReady: 'Tous les systèmes sont prêts',
      encrypted: 'Chiffré de bout en bout', planPill: 'Forfait ONE Global · Seulement 1 unité par mois', orbReady: 'Prêt',
      orbSub: "À l'écoute · contexte à jour", statDevices: 'Appareils connectés', statMemory: 'Mises à jour de la mémoire',
      statDone: "Terminé aujourd'hui", nowLabel: 'En ce moment', live: 'En direct', nowTask: 'Préparation de ton plan hebdomadaire',
      commandTitle: 'Donne une commande', commandSub: 'ONE Global comprend quoi faire et te montre ses limites.',
      commandPlaceholder: 'Par exemple : Prépare-moi pour la réunion de demain...', tabAssistant: 'Assistant',
      tabAutomations: 'Automatisations', tabMemory: 'Mémoire', tabDevices: 'Appareils', planTitle: 'Forfait ONE Global',
      planBack: "Retour à l'Assistant", planHeadline: 'Seulement 1 unité par mois, partout dans le monde',
      planSub: "Où que tu vives, ONE Global coûte toujours seulement 1 unité de ta monnaie locale — véritablement accessible à tous.",
      planCurrencyLabel: 'Choisis ta monnaie', planCurrencyAuto: 'Nous avons détecté automatiquement ta monnaie locale — tu peux la changer si tu veux.',
      planFeaturesTitle: 'Ce qui est inclus', planFeature1: 'Chat et gestion des tâches illimités',
      planFeature2: 'Automatisations et rappels', planFeature3: 'Synchronisation entre appareils', planFeature4: 'Support prioritaire',
      planMissionTitle: 'Bientôt : la boucle de partage',
      planMissionBody: "Notre vision est de partager une grande partie des revenus d'abonnement directement avec les personnes dans le besoin. Cette fonctionnalité n'est pas encore active — elle sera annoncée ici une fois le cadre juridique et financier en place.",
      planCta: "S'abonner", planDemoNote: "Ceci est un aperçu de design — aucun paiement réel n'est encore prélevé.", langLabel: 'Langue', goodNewsTitle: 'Les bonnes nouvelles du jour', goodNewsSubtitle: 'De vraies avancées réconfortantes venues du monde entier — pour te faire sourire.', goodNewsLoading: 'Chargement…', goodNewsError: 'Impossible de charger les bonnes nouvelles pour le moment — réessaie dans un instant.', onboardHeadline: "La seule appli qui pense à qui tu es aujourd'hui et à qui tu deviendras — faite pour te faire du bien.", onboardTrial: 'Gratuit la première semaine, puis seulement 1 unité de ta propre monnaie par mois.', onboardCta: 'Commencer gratuitement', onboardNote: 'Annule quand tu veux.', memberCountTitle: 'La famille ONE Global', memberCountLoading: 'Chargement…', memberCountGoalText: "Quand nous atteindrons 1 million de membres, 90% des revenus mensuels commenceront à être partagés avec des personnes dans le besoin.", memberCountActiveText: "En ce moment, 90% des revenus mensuels sont partagés avec des personnes dans le besoin. Notre prochain objectif : 1 milliard de membres.", planTrialBadge: 'Première semaine gratuite', planTrialLine: "Gratuit la première semaine. Annule quand tu veux ensuite.", quickStartTitle: "Démarrage rapide", quickStartSub: "Ce que tu peux vraiment faire maintenant", quickStartChatTitle: "Demande quelque chose à ONE Global", quickStartChatDesc: "Écris dans la case ci-dessous pour démarrer une vraie conversation avec l'IA.", quickStartRoutineTitle: "Configure ta routine quotidienne", quickStartRoutineDesc: "Reçois de vraies notifications selon tes horaires de réveil, de retour et de coucher.", quickStartGo: "Démarrer", devicesPreviewTitle: "Contrôle des appareils", devicesPreviewSub: "Pas encore — on te le dit honnêtement", devicesPreviewCardTitle: "ONE Global ne peut pas encore contrôler tes appareils", devicesPreviewCardDesc: "Touche pour voir les détails et la feuille de route",
    },
    de: {
      kicker: 'Kommandozentrale', greeting: 'Hallo', statusReady: 'Alle Systeme bereit',
      encrypted: 'Ende-zu-Ende verschlüsselt', planPill: 'ONE Global Plan · Nur 1 Einheit im Monat', orbReady: 'Bereit',
      orbSub: 'Hört zu · Kontext aktuell', statDevices: 'Verbundene Geräte', statMemory: 'Gedächtnis-Updates',
      statDone: 'Heute erledigt', nowLabel: 'Gerade jetzt', live: 'Live', nowTask: 'Bereitet deinen Wochenplan vor',
      commandTitle: 'Gib einen Befehl', commandSub: 'ONE Global versteht, was zu tun ist, und zeigt dir seine Grenzen.',
      commandPlaceholder: 'Zum Beispiel: Bereite mich auf das morgige Meeting vor...', tabAssistant: 'Assistent',
      tabAutomations: 'Automatisierungen', tabMemory: 'Gedächtnis', tabDevices: 'Geräte', planTitle: 'ONE Global Plan',
      planBack: 'Zurück zum Assistenten', planHeadline: 'Nur 1 Einheit im Monat, überall auf der Welt',
      planSub: 'Egal wo du lebst, ONE Global kostet immer nur 1 Einheit deiner lokalen Währung — wirklich zugänglich für alle.',
      planCurrencyLabel: 'Wähle deine Währung', planCurrencyAuto: 'Wir haben deine lokale Währung automatisch erkannt — du kannst sie ändern.',
      planFeaturesTitle: 'Was enthalten ist', planFeature1: 'Unbegrenzter Chat und Aufgabenverwaltung',
      planFeature2: 'Automatisierungen und Erinnerungen', planFeature3: 'Synchronisierung zwischen Geräten', planFeature4: 'Prioritäts-Support',
      planMissionTitle: 'Demnächst: der Teilungskreislauf',
      planMissionBody: 'Unsere Vision ist es, einen großen Teil der Abo-Einnahmen direkt mit Bedürftigen zu teilen. Diese Funktion ist noch nicht aktiv — sie wird hier angekündigt, sobald die rechtlichen und finanziellen Grundlagen stehen.',
      planCta: 'Abonnieren', planDemoNote: 'Dies ist eine Design-Vorschau — es wird noch keine echte Zahlung eingezogen.', langLabel: 'Sprache', goodNewsTitle: 'Die guten Nachrichten von heute', goodNewsSubtitle: 'Echte, ermutigende Entwicklungen aus aller Welt — damit du lächelst.', goodNewsLoading: 'Wird geladen…', goodNewsError: 'Gute Nachrichten konnten gerade nicht geladen werden — versuch es gleich noch einmal.', onboardHeadline: 'Die einzige App, die an dich denkt — heute und in Zukunft — und dich gut fühlen lässt.', onboardTrial: 'Die erste Woche kostenlos, danach nur 1 Einheit deiner eigenen Währung pro Monat.', onboardCta: 'Kostenlos starten', onboardNote: 'Jederzeit kündbar.', memberCountTitle: 'Die ONE Global-Familie', memberCountLoading: 'Wird geladen…', memberCountGoalText: 'Wenn wir 1 Million Mitglieder erreichen, werden 90% der monatlichen Einnahmen mit Menschen in Not geteilt.', memberCountActiveText: 'Gerade jetzt werden 90% der monatlichen Einnahmen mit Menschen in Not geteilt. Unser nächstes Ziel: 1 Milliarde Mitglieder.', planTrialBadge: 'Erste Woche kostenlos', planTrialLine: 'Die erste Woche kostenlos. Danach jederzeit kündbar.', quickStartTitle: "Schnellstart", quickStartSub: "Was du gerade wirklich tun kannst", quickStartChatTitle: "Frag ONE Global etwas", quickStartChatDesc: "Tippe unten in das Feld, um ein echtes KI-Gespräch zu starten.", quickStartRoutineTitle: "Richte deine tägliche Routine ein", quickStartRoutineDesc: "Erhalte echte Benachrichtigungen passend zu deinen Aufwach-, Heimkehr- und Schlafenszeiten.", quickStartGo: "Starten", devicesPreviewTitle: "Gerätesteuerung", devicesPreviewSub: "Noch nicht — wir sagen es dir ehrlich", devicesPreviewCardTitle: "ONE Global kann deine Geräte noch nicht steuern", devicesPreviewCardDesc: "Tippen für Details und die Roadmap",
    },
    pt: {
      kicker: 'Inteligência de comando', greeting: 'Olá', statusReady: 'Todos os sistemas prontos',
      encrypted: 'Criptografia de ponta a ponta', planPill: 'Plano ONE Global · Apenas 1 unidade por mês', orbReady: 'Pronto',
      orbSub: 'Ouvindo · contexto atualizado', statDevices: 'Dispositivos conectados', statMemory: 'Atualizações de memória',
      statDone: 'Concluído hoje', nowLabel: 'Agora mesmo', live: 'Ao vivo', nowTask: 'Preparando seu plano semanal',
      commandTitle: 'Dê um comando', commandSub: 'A ONE Global entende o que fazer e mostra seus limites.',
      commandPlaceholder: 'Por exemplo: Prepare-me para a reunião de amanhã...', tabAssistant: 'Assistente',
      tabAutomations: 'Automações', tabMemory: 'Memória', tabDevices: 'Dispositivos', planTitle: 'Plano ONE Global',
      planBack: 'Voltar ao Assistente', planHeadline: 'Apenas 1 unidade por mês, em qualquer lugar do mundo',
      planSub: 'Não importa onde você viva, a ONE Global sempre custa apenas 1 unidade da sua moeda local — verdadeiramente acessível para todos.',
      planCurrencyLabel: 'Escolha sua moeda', planCurrencyAuto: 'Detectamos automaticamente sua moeda local — você pode alterá-la se quiser.',
      planFeaturesTitle: 'O que está incluído', planFeature1: 'Chat e gestão de tarefas ilimitados',
      planFeature2: 'Automações e lembretes', planFeature3: 'Sincronização entre dispositivos', planFeature4: 'Suporte prioritário',
      planMissionTitle: 'Em breve: o ciclo de partilha',
      planMissionBody: 'Nossa visão é compartilhar uma grande parte da receita de assinaturas diretamente com pessoas necessitadas. Este recurso ainda não está ativo — será anunciado aqui quando a base legal e financeira estiver pronta.',
      planCta: 'Assinar', planDemoNote: 'Esta é uma prévia de design — nenhum pagamento real está sendo feito ainda.', langLabel: 'Idioma', goodNewsTitle: 'As boas notícias de hoje', goodNewsSubtitle: 'Novidades reais e animadoras de todo o mundo — para te fazer sorrir.', goodNewsLoading: 'Carregando…', goodNewsError: 'Não foi possível carregar as boas notícias agora — tente novamente em instantes.', onboardHeadline: 'O único app que pensa em quem você é hoje e em quem você será — feito para te fazer sentir bem.', onboardTrial: 'Grátis na primeira semana, depois apenas 1 unidade da sua própria moeda por mês.', onboardCta: 'Começar grátis', onboardNote: 'Cancele quando quiser.', memberCountTitle: 'A família ONE Global', memberCountLoading: 'Carregando…', memberCountGoalText: 'Quando chegarmos a 1 milhão de membros, 90% da receita mensal começará a ser compartilhada com quem precisa.', memberCountActiveText: 'Agora mesmo, 90% da receita mensal está sendo compartilhada com quem precisa. Nossa próxima meta: 1 bilhão de membros.', planTrialBadge: 'Primeira semana grátis', planTrialLine: 'Grátis na primeira semana. Cancele quando quiser depois.', quickStartTitle: "Início rápido", quickStartSub: "O que você realmente pode fazer agora", quickStartChatTitle: "Pergunte algo à ONE Global", quickStartChatDesc: "Digite na caixa abaixo para iniciar uma conversa real com a IA.", quickStartRoutineTitle: "Configure sua rotina diária", quickStartRoutineDesc: "Receba notificações reais com base nos seus horários de acordar, chegar em casa e dormir.", quickStartGo: "Começar", devicesPreviewTitle: "Controle de dispositivos", devicesPreviewSub: "Ainda não — estamos sendo honestos sobre isso", devicesPreviewCardTitle: "A ONE Global ainda não consegue controlar seus dispositivos", devicesPreviewCardDesc: "Toque para ver detalhes e o roteiro",
    },
    it: {
      kicker: 'Intelligenza di comando', greeting: 'Ciao', statusReady: 'Tutti i sistemi pronti',
      encrypted: 'Crittografia end-to-end', planPill: 'Piano ONE Global · Solo 1 unità al mese', orbReady: 'Pronto',
      orbSub: 'In ascolto · contesto aggiornato', statDevices: 'Dispositivi collegati', statMemory: 'Aggiornamenti memoria',
      statDone: 'Completati oggi', nowLabel: 'In questo momento', live: 'In diretta', nowTask: 'Sta preparando il tuo piano settimanale',
      commandTitle: 'Dai un comando', commandSub: 'ONE Global capisce cosa fare e ti mostra i suoi limiti.',
      commandPlaceholder: 'Ad esempio: Preparami per la riunione di domani...', tabAssistant: 'Assistente',
      tabAutomations: 'Automazioni', tabMemory: 'Memoria', tabDevices: 'Dispositivi', planTitle: 'Piano ONE Global',
      planBack: "Torna all'Assistente", planHeadline: 'Solo 1 unità al mese, ovunque nel mondo',
      planSub: 'Non importa dove vivi, ONE Global costa sempre solo 1 unità della tua valuta locale — davvero accessibile a tutti.',
      planCurrencyLabel: 'Scegli la tua valuta', planCurrencyAuto: 'Abbiamo rilevato automaticamente la tua valuta locale — puoi cambiarla se vuoi.',
      planFeaturesTitle: 'Cosa è incluso', planFeature1: 'Chat e gestione attività illimitate',
      planFeature2: 'Automazioni e promemoria', planFeature3: 'Sincronizzazione tra dispositivi', planFeature4: 'Supporto prioritario',
      planMissionTitle: 'Prossimamente: il ciclo di condivisione',
      planMissionBody: "La nostra visione è condividere gran parte dei ricavi degli abbonamenti direttamente con chi ne ha bisogno. Questa funzione non è ancora attiva — sarà annunciata qui una volta pronta la base legale e finanziaria.",
      planCta: 'Abbonati', planDemoNote: "Questa è un'anteprima di design — nessun pagamento reale viene ancora effettuato.", langLabel: 'Lingua', goodNewsTitle: 'Le buone notizie di oggi', goodNewsSubtitle: 'Sviluppi reali e incoraggianti da tutto il mondo — per farti sorridere.', goodNewsLoading: 'Caricamento…', goodNewsError: 'Al momento non è possibile caricare le buone notizie — riprova tra poco.', onboardHeadline: "L'unica app che pensa a chi sei oggi e a chi sarai — pensata per farti sentire bene.", onboardTrial: 'Gratis la prima settimana, poi solo 1 unità della tua valuta al mese.', onboardCta: 'Inizia gratis', onboardNote: 'Annulla quando vuoi.', memberCountTitle: 'La famiglia ONE Global', memberCountLoading: 'Caricamento…', memberCountGoalText: 'Quando raggiungeremo 1 milione di membri, il 90% delle entrate mensili inizierà a essere condiviso con chi ne ha bisogno.', memberCountActiveText: 'In questo momento, il 90% delle entrate mensili viene condiviso con chi ne ha bisogno. Il nostro prossimo obiettivo: 1 miliardo di membri.', planTrialBadge: 'Prima settimana gratis', planTrialLine: 'Gratis la prima settimana. Annulla quando vuoi dopo.', quickStartTitle: "Avvio rapido", quickStartSub: "Quello che puoi davvero fare adesso", quickStartChatTitle: "Chiedi qualcosa a ONE Global", quickStartChatDesc: "Scrivi nel campo qui sotto per iniziare una vera conversazione con l'IA.", quickStartRoutineTitle: "Imposta la tua routine quotidiana", quickStartRoutineDesc: "Ricevi notifiche reali in base ai tuoi orari di sveglia, rientro e sonno.", quickStartGo: "Inizia", devicesPreviewTitle: "Controllo dispositivi", devicesPreviewSub: "Non ancora — te lo diciamo onestamente", devicesPreviewCardTitle: "ONE Global non può ancora controllare i tuoi dispositivi", devicesPreviewCardDesc: "Tocca per dettagli e roadmap",
    },
    ru: {
      kicker: 'Командный интеллект', greeting: 'Привет', statusReady: 'Все системы готовы',
      encrypted: 'Сквозное шифрование', planPill: 'План ONE Global · Всего 1 единица в месяц', orbReady: 'Готов',
      orbSub: 'Слушает · контекст актуален', statDevices: 'Подключённые устройства', statMemory: 'Обновления памяти',
      statDone: 'Выполнено сегодня', nowLabel: 'Прямо сейчас', live: 'В эфире', nowTask: 'Готовит твой план на неделю',
      commandTitle: 'Дай команду', commandSub: 'ONE Global понимает, что делать, и показывает свои границы.',
      commandPlaceholder: 'Например: Подготовь меня к завтрашней встрече...', tabAssistant: 'Ассистент',
      tabAutomations: 'Автоматизации', tabMemory: 'Память', tabDevices: 'Устройства', planTitle: 'План ONE Global',
      planBack: 'Назад к ассистенту', planHeadline: 'Всего 1 единица в месяц, в любой точке мира',
      planSub: 'Где бы ты ни жил, ONE Global всегда стоит всего 1 единицу твоей местной валюты — по-настоящему доступно для всех.',
      planCurrencyLabel: 'Выбери свою валюту', planCurrencyAuto: 'Мы автоматически определили твою местную валюту — при желании можешь изменить.',
      planFeaturesTitle: 'Что включено', planFeature1: 'Безлимитный чат и управление задачами',
      planFeature2: 'Автоматизации и напоминания', planFeature3: 'Синхронизация между устройствами', planFeature4: 'Приоритетная поддержка',
      planMissionTitle: 'Скоро: цикл поддержки',
      planMissionBody: 'Наша цель — делиться значительной частью дохода от подписки напрямую с нуждающимися. Эта функция пока не активна — она будет объявлена здесь, когда будет готова правовая и финансовая основа.',
      planCta: 'Подписаться', planDemoNote: 'Это предварительный просмотр дизайна — реальная оплата пока не взимается.', langLabel: 'Язык', goodNewsTitle: 'Хорошие новости дня', goodNewsSubtitle: 'Настоящие, вдохновляющие события со всего мира — чтобы ты улыбнулся.', goodNewsLoading: 'Загрузка…', goodNewsError: 'Не удалось загрузить хорошие новости — попробуй ещё раз чуть позже.', onboardHeadline: 'Единственное приложение, которое думает о тебе — сегодняшнем и будущем — и хочет, чтобы тебе было хорошо.', onboardTrial: 'Первая неделя бесплатно, затем всего 1 единица твоей валюты в месяц.', onboardCta: 'Начать бесплатно', onboardNote: 'Отменить можно в любой момент.', memberCountTitle: 'Семья ONE Global', memberCountLoading: 'Загрузка…', memberCountGoalText: 'Когда мы достигнем 1 миллиона участников, 90% ежемесячного дохода начнут делиться с нуждающимися.', memberCountActiveText: 'Прямо сейчас 90% ежемесячного дохода делится с нуждающимися. Следующая цель: 1 миллиард участников.', planTrialBadge: 'Первая неделя бесплатно', planTrialLine: 'Первая неделя бесплатно. Отменить можно в любой момент после этого.', quickStartTitle: "Быстрый старт", quickStartSub: "Что ты действительно можешь сделать прямо сейчас", quickStartChatTitle: "Спроси что-нибудь у ONE Global", quickStartChatDesc: "Напиши в поле ниже, чтобы начать настоящий разговор с ИИ.", quickStartRoutineTitle: "Настрой свой распорядок дня", quickStartRoutineDesc: "Получай настоящие уведомления по времени пробуждения, возвращения домой и сна.", quickStartGo: "Начать", devicesPreviewTitle: "Управление устройствами", devicesPreviewSub: "Пока нет — говорим об этом честно", devicesPreviewCardTitle: "ONE Global пока не может управлять твоими устройствами", devicesPreviewCardDesc: "Нажми, чтобы узнать подробности и дорожную карту",
    },
    ar: {
      kicker: 'ذكاء القيادة', greeting: 'مرحبًا', statusReady: 'كل الأنظمة جاهزة',
      encrypted: 'مشفّر من طرف إلى طرف', planPill: 'خطة ONE Global · وحدة واحدة فقط شهريًا', orbReady: 'جاهز',
      orbSub: 'يستمع إليك · السياق محدّث', statDevices: 'الأجهزة المتصلة', statMemory: 'تحديثات الذاكرة',
      statDone: 'أُنجز اليوم', nowLabel: 'الآن', live: 'مباشر', nowTask: 'يُجهّز خطتك الأسبوعية',
      commandTitle: 'أعطِ أمرًا', commandSub: 'يفهم ONE Global ما يجب فعله ويوضح لك حدوده.',
      commandPlaceholder: 'مثال: جهّزني لاجتماع الغد...', tabAssistant: 'المساعد',
      tabAutomations: 'الأتمتة', tabMemory: 'الذاكرة', tabDevices: 'الأجهزة', planTitle: 'خطة ONE Global',
      planBack: 'العودة إلى المساعد', planHeadline: 'وحدة واحدة فقط شهريًا، في أي مكان في العالم',
      planSub: 'أينما كنت تعيش، تكلف ONE Global دائمًا وحدة واحدة فقط من عملتك المحلية — متاحة حقًا للجميع.',
      planCurrencyLabel: 'اختر عملتك', planCurrencyAuto: 'اكتشفنا عملتك المحلية تلقائيًا — يمكنك تغييرها إذا أردت.',
      planFeaturesTitle: 'ما الذي تتضمنه الخطة', planFeature1: 'دردشة وإدارة مهام غير محدودة',
      planFeature2: 'الأتمتة والتذكيرات', planFeature3: 'مزامنة بين الأجهزة', planFeature4: 'دعم ذو أولوية',
      planMissionTitle: 'قريبًا: دورة المشاركة',
      planMissionBody: 'رؤيتنا هي مشاركة جزء كبير من إيرادات الاشتراك مباشرة مع المحتاجين. هذه الميزة غير مفعّلة بعد — سيُعلن عنها هنا عند اكتمال الأساس القانوني والمالي.',
      planCta: 'اشترك', planDemoNote: 'هذه معاينة تصميم فقط — لا يتم تحصيل أي دفعة حقيقية بعد.', langLabel: 'اللغة', goodNewsTitle: 'أخبار جميلة اليوم', goodNewsSubtitle: 'تطورات حقيقية ومُلهمة من حول العالم — لترسم ابتسامة على وجهك.', goodNewsLoading: 'جارٍ التحميل…', goodNewsError: 'تعذّر تحميل الأخبار الجميلة الآن — حاول مرة أخرى بعد قليل.', onboardHeadline: 'التطبيق الوحيد الذي يهتم بمن أنت الآن ومن ستكون — صُمم ليشعرك بالراحة.', onboardTrial: 'مجاني في أسبوعك الأول، ثم وحدة واحدة فقط من عملتك المحلية شهريًا.', onboardCta: 'ابدأ مجانًا', onboardNote: 'يمكنك الإلغاء في أي وقت.', memberCountTitle: 'عائلة ONE Global', memberCountLoading: 'جارٍ التحميل…', memberCountGoalText: 'عندما نصل إلى مليون عضو، سيبدأ تقاسم 90% من الإيرادات الشهرية مع المحتاجين.', memberCountActiveText: 'الآن، يتم تقاسم 90% من الإيرادات الشهرية مع المحتاجين. هدفنا القادم: مليار عضو.', planTrialBadge: 'الأسبوع الأول مجانًا', planTrialLine: 'مجاني في الأسبوع الأول. يمكنك الإلغاء في أي وقت بعد ذلك.', quickStartTitle: "بداية سريعة", quickStartSub: "ما يمكنك فعله فعليًا الآن", quickStartChatTitle: "اسأل ONE Global عن شيء", quickStartChatDesc: "اكتب في الحقل أدناه لبدء محادثة حقيقية مع الذكاء الاصطناعي.", quickStartRoutineTitle: "اضبط روتينك اليومي", quickStartRoutineDesc: "احصل على إشعارات حقيقية بناءً على أوقات استيقاظك وعودتك للمنزل ونومك.", quickStartGo: "ابدأ", devicesPreviewTitle: "التحكم بالأجهزة", devicesPreviewSub: "ليس بعد — نخبرك بصراحة", devicesPreviewCardTitle: "لا يمكن لـ ONE Global التحكم بأجهزتك بعد", devicesPreviewCardDesc: "اضغط لمعرفة التفاصيل وخارطة الطريق",
    },
    hi: {
      kicker: 'कमांड इंटेलिजेंस', greeting: 'नमस्ते', statusReady: 'सभी सिस्टम तैयार हैं',
      encrypted: 'एंड-टू-एंड एन्क्रिप्टेड', planPill: 'ONE Global प्लान · सिर्फ़ 1 यूनिट प्रति माह', orbReady: 'तैयार',
      orbSub: 'सुन रहा है · संदर्भ अद्यतित', statDevices: 'जुड़े हुए डिवाइस', statMemory: 'मेमोरी अपडेट',
      statDone: 'आज पूरा हुआ', nowLabel: 'अभी', live: 'लाइव', nowTask: 'आपकी साप्ताहिक योजना तैयार कर रहा है',
      commandTitle: 'कमांड दें', commandSub: 'ONE Global समझता है कि क्या करना है और अपनी सीमाएं दिखाता है।',
      commandPlaceholder: 'उदाहरण: कल की मीटिंग के लिए मुझे तैयार करो...', tabAssistant: 'असिस्टेंट',
      tabAutomations: 'ऑटोमेशन', tabMemory: 'मेमोरी', tabDevices: 'डिवाइस', planTitle: 'ONE Global प्लान',
      planBack: 'असिस्टेंट पर वापस जाएं', planHeadline: 'दुनिया में कहीं भी, सिर्फ़ 1 यूनिट प्रति माह',
      planSub: 'आप जहां भी रहें, ONE Global की कीमत हमेशा आपकी स्थानीय मुद्रा की सिर्फ़ 1 यूनिट है — जो सच में सबके लिए सुलभ है।',
      planCurrencyLabel: 'अपनी मुद्रा चुनें', planCurrencyAuto: 'हमने आपकी स्थानीय मुद्रा अपने आप पहचान ली है — चाहें तो बदल सकते हैं।',
      planFeaturesTitle: 'इसमें क्या शामिल है', planFeature1: 'असीमित चैट और टास्क प्रबंधन',
      planFeature2: 'ऑटोमेशन और रिमाइंडर', planFeature3: 'डिवाइसों के बीच सिंक', planFeature4: 'प्राथमिकता सहायता',
      planMissionTitle: 'जल्द आ रहा है: साझाकरण चक्र',
      planMissionBody: 'हमारा विज़न है कि सब्सक्रिप्शन आय का एक बड़ा हिस्सा सीधे ज़रूरतमंदों के साथ साझा किया जाए। यह सुविधा अभी सक्रिय नहीं है — कानूनी और वित्तीय ढांचा तैयार होते ही यहां घोषणा की जाएगी।',
      planCta: 'सब्सक्राइब करें', planDemoNote: 'यह एक डिज़ाइन प्रीव्यू है — अभी कोई असली भुगतान नहीं लिया जा रहा।', langLabel: 'भाषा', goodNewsTitle: 'आज की अच्छी खबरें', goodNewsSubtitle: 'दुनिया भर से सच्ची, उत्साहजनक खबरें — तुम्हारे चेहरे पर मुस्कान लाने के लिए।', goodNewsLoading: 'लोड हो रहा है…', goodNewsError: 'अभी अच्छी खबरें लोड नहीं हो पाईं — थोड़ी देर बाद फिर से कोशिश करें।', onboardHeadline: 'एकमात्र ऐप जो तुम्हारे आज और आने वाले कल दोनों की परवाह करता है — तुम्हें अच्छा महसूस कराने के लिए बनाया गया।', onboardTrial: 'पहला हफ़्ता मुफ़्त, उसके बाद हर महीने सिर्फ़ 1 यूनिट तुम्हारी अपनी करेंसी में।', onboardCta: 'मुफ़्त शुरू करें', onboardNote: 'कभी भी कैंसिल कर सकते हो।', memberCountTitle: 'ONE Global परिवार', memberCountLoading: 'लोड हो रहा है…', memberCountGoalText: 'जब हम 10 लाख सदस्यों तक पहुँचेंगे, तो हर महीने की आय का 90% ज़रूरतमंदों के साथ साझा किया जाने लगेगा।', memberCountActiveText: 'अभी, हर महीने की आय का 90% ज़रूरतमंदों के साथ साझा किया जा रहा है। हमारा अगला लक्ष्य: 1 अरब सदस्य।', planTrialBadge: 'पहला हफ़्ता मुफ़्त', planTrialLine: 'पहला हफ़्ता मुफ़्त। उसके बाद कभी भी कैंसिल करें।', quickStartTitle: "क्विक स्टार्ट", quickStartSub: "अभी तुम वास्तव में क्या कर सकते हो", quickStartChatTitle: "ONE Global से कुछ पूछें", quickStartChatDesc: "असली AI बातचीत शुरू करने के लिए नीचे बॉक्स में लिखें।", quickStartRoutineTitle: "अपनी दैनिक दिनचर्या सेट करें", quickStartRoutineDesc: "अपने जागने, घर पहुंचने और सोने के समय के अनुसार असली सूचनाएं पाएं।", quickStartGo: "शुरू करें", devicesPreviewTitle: "डिवाइस नियंत्रण", devicesPreviewSub: "अभी नहीं — हम इसे ईमानदारी से बता रहे हैं", devicesPreviewCardTitle: "ONE Global अभी तुम्हारे डिवाइस नियंत्रित नहीं कर सकता", devicesPreviewCardDesc: "विवरण और रोडमैप के लिए टैप करें",
    },
    bn: {
      kicker: 'কমান্ড ইন্টেলিজেন্স', greeting: 'হ্যালো', statusReady: 'সব সিস্টেম প্রস্তুত',
      encrypted: 'এন্ড-টু-এন্ড এনক্রিপ্টেড', planPill: 'ONE Global প্ল্যান · মাসে মাত্র ১ ইউনিট', orbReady: 'প্রস্তুত',
      orbSub: 'শুনছে · প্রসঙ্গ হালনাগাদ', statDevices: 'সংযুক্ত ডিভাইস', statMemory: 'মেমরি আপডেট',
      statDone: 'আজ সম্পন্ন', nowLabel: 'এই মুহূর্তে', live: 'লাইভ', nowTask: 'তোমার সাপ্তাহিক পরিকল্পনা তৈরি করছে',
      commandTitle: 'একটি কমান্ড দাও', commandSub: 'ONE Global বোঝে কী করতে হবে এবং তার সীমা দেখায়।',
      commandPlaceholder: 'উদাহরণ: আগামীকালের মিটিংয়ের জন্য আমাকে প্রস্তুত করো...', tabAssistant: 'অ্যাসিস্ট্যান্ট',
      tabAutomations: 'অটোমেশন', tabMemory: 'মেমরি', tabDevices: 'ডিভাইস', planTitle: 'ONE Global প্ল্যান',
      planBack: 'অ্যাসিস্ট্যান্টে ফিরে যাও', planHeadline: 'বিশ্বের যেকোনো জায়গায়, মাসে মাত্র ১ ইউনিট',
      planSub: 'তুমি যেখানেই থাকো না কেন, ONE Global-এর দাম সবসময় তোমার স্থানীয় মুদ্রার মাত্র ১ ইউনিট — সত্যিকার অর্থে সবার জন্য সহজলভ্য।',
      planCurrencyLabel: 'তোমার মুদ্রা বেছে নাও', planCurrencyAuto: 'আমরা স্বয়ংক্রিয়ভাবে তোমার স্থানীয় মুদ্রা শনাক্ত করেছি — চাইলে বদলাতে পারো।',
      planFeaturesTitle: 'যা অন্তর্ভুক্ত', planFeature1: 'সীমাহীন চ্যাট এবং টাস্ক ব্যবস্থাপনা',
      planFeature2: 'অটোমেশন এবং রিমাইন্ডার', planFeature3: 'ডিভাইসের মধ্যে সিঙ্ক', planFeature4: 'অগ্রাধিকার সহায়তা',
      planMissionTitle: 'শীঘ্রই আসছে: শেয়ারিং চক্র',
      planMissionBody: 'আমাদের লক্ষ্য হলো সাবস্ক্রিপশন আয়ের একটি বড় অংশ সরাসরি অভাবীদের সাথে ভাগ করা। এই বৈশিষ্ট্যটি এখনো সক্রিয় নয় — আইনি ও আর্থিক ভিত্তি প্রস্তুত হলে এখানে ঘোষণা করা হবে।',
      planCta: 'সাবস্ক্রাইব করো', planDemoNote: 'এটি একটি ডিজাইন প্রিভিউ — এখনো কোনো প্রকৃত পেমেন্ট নেওয়া হচ্ছে না।', langLabel: 'ভাষা', goodNewsTitle: 'আজকের ভালো খবর', goodNewsSubtitle: 'সারা বিশ্ব থেকে সত্যিকারের, উৎসাহব্যঞ্জক খবর — তোমার মুখে হাসি ফোটাতে।', goodNewsLoading: 'লোড হচ্ছে…', goodNewsError: 'এখন ভালো খবর লোড করা যায়নি — একটু পরে আবার চেষ্টা করো।', onboardHeadline: 'একমাত্র অ্যাপ যা তোমার আজকের এবং আগামী দিনের কথা ভাবে — তোমাকে ভালো অনুভব করাতে তৈরি।', onboardTrial: 'প্রথম সপ্তাহ বিনামূল্যে, তারপর মাসে মাত্র ১ ইউনিট তোমার নিজের মুদ্রায়।', onboardCta: 'বিনামূল্যে শুরু করো', onboardNote: 'যেকোনো সময় বাতিল করতে পারো।', memberCountTitle: 'ONE Global পরিবার', memberCountLoading: 'লোড হচ্ছে…', memberCountGoalText: 'আমরা যখন ১০ লাখ সদস্যে পৌঁছাব, তখন থেকে মাসিক আয়ের ৯০% অভাবীদের সাথে ভাগ করা শুরু হবে।', memberCountActiveText: 'এখন, মাসিক আয়ের ৯০% অভাবীদের সাথে ভাগ করা হচ্ছে। আমাদের পরবর্তী লক্ষ্য: ১০০ কোটি (১ বিলিয়ন) সদস্য।', planTrialBadge: 'প্রথম সপ্তাহ বিনামূল্যে', planTrialLine: 'প্রথম সপ্তাহ বিনামূল্যে। তারপর যেকোনো সময় বাতিল করো।', quickStartTitle: "দ্রুত শুরু", quickStartSub: "তুমি এখন সত্যিই যা করতে পারো", quickStartChatTitle: "ONE Global-কে কিছু জিজ্ঞাসা করো", quickStartChatDesc: "একটি প্রকৃত AI কথোপকথন শুরু করতে নিচের বাক্সে লেখো।", quickStartRoutineTitle: "তোমার দৈনন্দিন রুটিন সেট করো", quickStartRoutineDesc: "তোমার ঘুম থেকে ওঠা, বাড়ি ফেরা ও ঘুমানোর সময় অনুযায়ী প্রকৃত বিজ্ঞপ্তি পাও।", quickStartGo: "শুরু করো", devicesPreviewTitle: "ডিভাইস নিয়ন্ত্রণ", devicesPreviewSub: "এখনও নেই — আমরা সততার সাথে বলছি", devicesPreviewCardTitle: "ONE Global এখনও তোমার ডিভাইস নিয়ন্ত্রণ করতে পারে না", devicesPreviewCardDesc: "বিস্তারিত ও রোডম্যাপের জন্য ট্যাপ করো",
    },
    zh: {
      kicker: '指挥智能', greeting: '你好', statusReady: '所有系统就绪',
      encrypted: '端到端加密', planPill: 'ONE Global 计划 · 每月仅需 1 个单位', orbReady: '就绪',
      orbSub: '正在聆听 · 上下文已更新', statDevices: '已连接设备', statMemory: '记忆更新',
      statDone: '今日已完成', nowLabel: '当前', live: '进行中', nowTask: '正在准备你的每周计划',
      commandTitle: '下达指令', commandSub: 'ONE Global 能理解要做什么，并向你展示它的边界。',
      commandPlaceholder: '例如：帮我准备明天的会议…', tabAssistant: '助手',
      tabAutomations: '自动化', tabMemory: '记忆', tabDevices: '设备', planTitle: 'ONE Global 计划',
      planBack: '返回助手', planHeadline: '无论身在何处，每月仅需 1 个单位',
      planSub: '无论你住在哪里，ONE Global 始终只需你当地货币的 1 个单位 —— 真正让每个人都能负担得起。',
      planCurrencyLabel: '选择你的货币', planCurrencyAuto: '我们已自动识别你的本地货币 —— 你可以随时更改。',
      planFeaturesTitle: '包含内容', planFeature1: '无限聊天与任务管理',
      planFeature2: '自动化与提醒', planFeature3: '跨设备同步', planFeature4: '优先支持',
      planMissionTitle: '即将推出：分享循环',
      planMissionBody: '我们的愿景是将订阅收入的很大一部分直接分享给有需要的人。此功能尚未启用 —— 法律与财务基础就绪后会在此公布。',
      planCta: '订阅', planDemoNote: '这只是设计预览 —— 尚未收取任何真实付款。', langLabel: '语言', goodNewsTitle: '今日好消息', goodNewsSubtitle: '来自世界各地的真实、振奋人心的进展 —— 让你露出笑容。', goodNewsLoading: '加载中…', goodNewsError: '暂时无法加载好消息 —— 请稍后再试。', onboardHeadline: '唯一一款关心你现在和未来的应用——只为让你感觉更好而生。', onboardTrial: '首周免费，之后每月仅需1个单位的当地货币。', onboardCta: '免费开始', onboardNote: '随时可以取消。', memberCountTitle: 'ONE Global大家庭', memberCountLoading: '加载中…', memberCountGoalText: '当我们达到100万会员时，每月收入的90%将开始与有需要的人分享。', memberCountActiveText: '现在，每月收入的90%正在与有需要的人分享。我们的下一个目标：10亿会员。', planTrialBadge: '首周免费', planTrialLine: '首周免费，之后随时可以取消。', quickStartTitle: "快速开始", quickStartSub: "你现在真正能做的事", quickStartChatTitle: "向 ONE Global 提问", quickStartChatDesc: "在下方输入框中输入，开始真实的 AI 对话。", quickStartRoutineTitle: "设置你的日常安排", quickStartRoutineDesc: "根据你的起床、到家和睡觉时间获得真实的提醒。", quickStartGo: "开始", devicesPreviewTitle: "设备控制", devicesPreviewSub: "尚未支持 — 我们如实告知", devicesPreviewCardTitle: "ONE Global 目前还无法控制你的设备", devicesPreviewCardDesc: "点击查看详情和路线图",
    },
    ja: {
      kicker: 'コマンドインテリジェンス', greeting: 'こんにちは', statusReady: 'すべてのシステムが準備完了',
      encrypted: 'エンドツーエンド暗号化', planPill: 'ONE Globalプラン · 月額わずか1ユニット', orbReady: '準備完了',
      orbSub: '聞いています · コンテキストは最新', statDevices: '接続デバイス', statMemory: 'メモリ更新',
      statDone: '本日完了', nowLabel: '現在', live: 'ライブ', nowTask: '週間プランを準備中',
      commandTitle: '指示を出す', commandSub: 'ONE Globalは何をすべきか理解し、その限界も示します。',
      commandPlaceholder: '例：明日の会議の準備をして…', tabAssistant: 'アシスタント',
      tabAutomations: 'オートメーション', tabMemory: 'メモリ', tabDevices: 'デバイス', planTitle: 'ONE Globalプラン',
      planBack: 'アシスタントに戻る', planHeadline: '世界のどこでも、月額わずか1ユニット',
      planSub: 'どこに住んでいても、ONE Globalは常にあなたの現地通貨のわずか1ユニット —— 誰にとっても本当に手が届く価格です。',
      planCurrencyLabel: '通貨を選択', planCurrencyAuto: 'お住まいの地域の通貨を自動検出しました —— 必要に応じて変更できます。',
      planFeaturesTitle: 'プランに含まれるもの', planFeature1: '無制限のチャットとタスク管理',
      planFeature2: 'オートメーションとリマインダー', planFeature3: 'デバイス間の同期', planFeature4: '優先サポート',
      planMissionTitle: '近日公開：シェアリングループ',
      planMissionBody: '私たちのビジョンは、購読収益の大部分を直接支援が必要な人々と分かち合うことです。この機能はまだ有効化されていません —— 法的・財務的な基盤が整い次第、ここで発表します。',
      planCta: '購読する', planDemoNote: 'これはデザインのプレビューです —— まだ実際の支払いは発生しません。', langLabel: '言語', goodNewsTitle: '今日のグッドニュース', goodNewsSubtitle: '世界中からの本物の、励みになる出来事 —— あなたの笑顔のために。', goodNewsLoading: '読み込み中…', goodNewsError: '現在グッドニュースを読み込めません —— しばらくしてからもう一度お試しください。', onboardHeadline: '今のあなたと、これからのあなたを想う——気分を良くするために作られた唯一のアプリ。', onboardTrial: '最初の1週間は無料、その後は月にたった1単位のあなたの通貨だけ。', onboardCta: '無料で始める', onboardNote: 'いつでも解約できます。', memberCountTitle: 'ONE Globalファミリー', memberCountLoading: '読み込み中…', memberCountGoalText: '会員数が100万人に達したら、毎月の収益の90%を困っている人々と分かち合い始めます。', memberCountActiveText: '現在、毎月の収益の90%が困っている人々と分かち合われています。次の目標:10億人。', planTrialBadge: '最初の1週間無料', planTrialLine: '最初の1週間は無料。その後はいつでも解約できます。', quickStartTitle: "クイックスタート", quickStartSub: "今すぐ本当にできること", quickStartChatTitle: "ONE Globalに何か聞いてみる", quickStartChatDesc: "下のボックスに入力すると、本物のAIとの会話が始まります。", quickStartRoutineTitle: "毎日のルーティンを設定する", quickStartRoutineDesc: "起床・帰宅・就寝の時間に合わせた本物の通知を受け取れます。", quickStartGo: "開始", devicesPreviewTitle: "デバイス制御", devicesPreviewSub: "まだありません — 正直にお伝えします", devicesPreviewCardTitle: "ONE Globalはまだあなたのデバイスを制御できません", devicesPreviewCardDesc: "詳細とロードマップを見るにはタップ",
    },
    ko: {
      kicker: '커맨드 인텔리전스', greeting: '안녕하세요', statusReady: '모든 시스템 준비 완료',
      encrypted: '종단간 암호화', planPill: 'ONE Global 플랜 · 월 단 1유닛', orbReady: '준비 완료',
      orbSub: '듣고 있어요 · 컨텍스트 최신 상태', statDevices: '연결된 기기', statMemory: '메모리 업데이트',
      statDone: '오늘 완료', nowLabel: '지금', live: '실시간', nowTask: '주간 계획을 준비 중',
      commandTitle: '명령을 내리세요', commandSub: 'ONE Global은 무엇을 해야 할지 이해하고 한계를 보여줍니다.',
      commandPlaceholder: '예: 내일 회의를 준비해줘...', tabAssistant: '어시스턴트',
      tabAutomations: '자동화', tabMemory: '메모리', tabDevices: '기기', planTitle: 'ONE Global 플랜',
      planBack: '어시스턴트로 돌아가기', planHeadline: '전 세계 어디서나, 월 단 1유닛',
      planSub: '어디에 살든, ONE Global은 항상 현지 통화 단 1유닛입니다 —— 누구에게나 진정으로 부담 없는 가격이에요.',
      planCurrencyLabel: '통화 선택', planCurrencyAuto: '현지 통화를 자동으로 감지했어요 —— 원하면 변경할 수 있습니다.',
      planFeaturesTitle: '포함된 내용', planFeature1: '무제한 채팅 및 작업 관리',
      planFeature2: '자동화 및 알림', planFeature3: '기기 간 동기화', planFeature4: '우선 지원',
      planMissionTitle: '곧 출시: 나눔 순환',
      planMissionBody: '저희의 비전은 구독 수익의 큰 부분을 도움이 필요한 분들과 직접 나누는 것입니다. 이 기능은 아직 활성화되지 않았습니다 —— 법적·재정적 기반이 마련되면 이곳에서 공지하겠습니다.',
      planCta: '구독하기', planDemoNote: '이것은 디자인 미리보기입니다 —— 아직 실제 결제는 이루어지지 않습니다.', langLabel: '언어', goodNewsTitle: '오늘의 좋은 소식', goodNewsSubtitle: '전 세계의 진짜 희망적인 소식들 —— 당신의 미소를 위해.', goodNewsLoading: '불러오는 중…', goodNewsError: '지금은 좋은 소식을 불러올 수 없어요 —— 잠시 후 다시 시도해 주세요.', onboardHeadline: '지금의 당신과 미래의 당신을 생각하는 유일한 앱 —— 기분 좋게 해주기 위해 만들어졌어요.', onboardTrial: '첫 주는 무료, 이후에는 매달 자국 통화로 단 1단위만.', onboardCta: '무료로 시작하기', onboardNote: '언제든지 취소할 수 있어요.', memberCountTitle: 'ONE Global 가족', memberCountLoading: '불러오는 중…', memberCountGoalText: '회원 수가 100만 명에 도달하면, 매달 수익의 90%가 어려운 이웃과 나눠지기 시작합니다.', memberCountActiveText: '지금, 매달 수익의 90%가 어려운 이웃과 나눠지고 있어요. 다음 목표는 10억 명입니다.', planTrialBadge: '첫 주 무료', planTrialLine: '첫 주는 무료. 이후 언제든지 취소할 수 있어요.', quickStartTitle: "빠른 시작", quickStartSub: "지금 실제로 할 수 있는 것", quickStartChatTitle: "ONE Global에게 물어보기", quickStartChatDesc: "아래 입력창에 입력하면 실제 AI 대화가 시작됩니다.", quickStartRoutineTitle: "일상 루틴 설정하기", quickStartRoutineDesc: "기상, 귀가, 취침 시간에 맞춘 실제 알림을 받아보세요.", quickStartGo: "시작", devicesPreviewTitle: "기기 제어", devicesPreviewSub: "아직은 없어요 — 솔직하게 말씀드려요", devicesPreviewCardTitle: "ONE Global은 아직 당신의 기기를 제어할 수 없어요", devicesPreviewCardDesc: "자세한 내용과 로드맵을 보려면 탭하세요",
    },
    id: {
      kicker: 'Kecerdasan komando', greeting: 'Halo', statusReady: 'Semua sistem siap',
      encrypted: 'Terenkripsi ujung ke ujung', planPill: 'Paket ONE Global · Hanya 1 unit per bulan', orbReady: 'Siap',
      orbSub: 'Mendengarkan · konteks terkini', statDevices: 'Perangkat terhubung', statMemory: 'Pembaruan memori',
      statDone: 'Selesai hari ini', nowLabel: 'Saat ini', live: 'Langsung', nowTask: 'Menyiapkan rencana mingguanmu',
      commandTitle: 'Berikan perintah', commandSub: 'ONE Global memahami apa yang harus dilakukan dan menunjukkan batasannya.',
      commandPlaceholder: 'Contoh: Siapkan aku untuk rapat besok...', tabAssistant: 'Asisten',
      tabAutomations: 'Otomatisasi', tabMemory: 'Memori', tabDevices: 'Perangkat', planTitle: 'Paket ONE Global',
      planBack: 'Kembali ke Asisten', planHeadline: 'Hanya 1 unit per bulan, di mana pun di dunia',
      planSub: 'Di mana pun kamu tinggal, ONE Global selalu seharga 1 unit mata uang lokalmu — benar-benar terjangkau untuk semua orang.',
      planCurrencyLabel: 'Pilih mata uangmu', planCurrencyAuto: 'Kami mendeteksi mata uang lokalmu secara otomatis — kamu bisa mengubahnya jika mau.',
      planFeaturesTitle: 'Yang termasuk', planFeature1: 'Obrolan dan manajemen tugas tanpa batas',
      planFeature2: 'Otomatisasi dan pengingat', planFeature3: 'Sinkronisasi antar perangkat', planFeature4: 'Dukungan prioritas',
      planMissionTitle: 'Segera hadir: siklus berbagi',
      planMissionBody: 'Visi kami adalah membagikan sebagian besar pendapatan langganan langsung kepada mereka yang membutuhkan. Fitur ini belum aktif — akan diumumkan di sini setelah landasan hukum dan keuangannya siap.',
      planCta: 'Berlangganan', planDemoNote: 'Ini adalah pratinjau desain — belum ada pembayaran nyata yang diambil.', langLabel: 'Bahasa', goodNewsTitle: 'Kabar baik hari ini', goodNewsSubtitle: 'Perkembangan nyata dan menginspirasi dari seluruh dunia — agar kamu tersenyum.', goodNewsLoading: 'Memuat…', goodNewsError: 'Kabar baik belum bisa dimuat sekarang — coba lagi sebentar lagi.', onboardHeadline: 'Satu-satunya aplikasi yang memikirkan dirimu sekarang dan di masa depan — dibuat untuk membuatmu merasa baik.', onboardTrial: 'Gratis minggu pertama, setelah itu hanya 1 unit mata uangmu sendiri per bulan.', onboardCta: 'Mulai Gratis', onboardNote: 'Bisa dibatalkan kapan saja.', memberCountTitle: 'Keluarga ONE Global', memberCountLoading: 'Memuat…', memberCountGoalText: 'Saat kami mencapai 1 juta anggota, 90% pendapatan bulanan akan mulai dibagikan kepada mereka yang membutuhkan.', memberCountActiveText: 'Saat ini, 90% pendapatan bulanan dibagikan kepada mereka yang membutuhkan. Target berikutnya: 1 miliar anggota.', planTrialBadge: 'Minggu pertama gratis', planTrialLine: 'Gratis minggu pertama. Bisa dibatalkan kapan saja setelahnya.', quickStartTitle: "Mulai cepat", quickStartSub: "Yang benar-benar bisa kamu lakukan sekarang", quickStartChatTitle: "Tanyakan sesuatu ke ONE Global", quickStartChatDesc: "Ketik di kotak di bawah untuk memulai percakapan AI yang sesungguhnya.", quickStartRoutineTitle: "Atur rutinitas harianmu", quickStartRoutineDesc: "Dapatkan notifikasi nyata berdasarkan waktu bangun, pulang, dan tidurmu.", quickStartGo: "Mulai", devicesPreviewTitle: "Kontrol perangkat", devicesPreviewSub: "Belum ada — kami jujur soal ini", devicesPreviewCardTitle: "ONE Global belum bisa mengontrol perangkatmu", devicesPreviewCardDesc: "Ketuk untuk detail dan peta jalan",
    },
    vi: {
      kicker: 'Trí tuệ chỉ huy', greeting: 'Xin chào', statusReady: 'Mọi hệ thống đã sẵn sàng',
      encrypted: 'Mã hóa đầu cuối', planPill: 'Gói ONE Global · Chỉ 1 đơn vị mỗi tháng', orbReady: 'Sẵn sàng',
      orbSub: 'Đang lắng nghe · ngữ cảnh cập nhật', statDevices: 'Thiết bị đã kết nối', statMemory: 'Cập nhật bộ nhớ',
      statDone: 'Hoàn thành hôm nay', nowLabel: 'Ngay bây giờ', live: 'Trực tiếp', nowTask: 'Đang chuẩn bị kế hoạch tuần của bạn',
      commandTitle: 'Đưa ra lệnh', commandSub: 'ONE Global hiểu phải làm gì và cho bạn thấy giới hạn của nó.',
      commandPlaceholder: 'Ví dụ: Chuẩn bị cho tôi cuộc họp ngày mai...', tabAssistant: 'Trợ lý',
      tabAutomations: 'Tự động hóa', tabMemory: 'Bộ nhớ', tabDevices: 'Thiết bị', planTitle: 'Gói ONE Global',
      planBack: 'Quay lại Trợ lý', planHeadline: 'Chỉ 1 đơn vị mỗi tháng, ở bất cứ đâu trên thế giới',
      planSub: 'Dù bạn sống ở đâu, ONE Global luôn chỉ có giá 1 đơn vị tiền tệ địa phương của bạn — thực sự dễ tiếp cận cho tất cả mọi người.',
      planCurrencyLabel: 'Chọn đơn vị tiền tệ', planCurrencyAuto: 'Chúng tôi đã tự động nhận diện tiền tệ địa phương của bạn — bạn có thể thay đổi nếu muốn.',
      planFeaturesTitle: 'Bao gồm những gì', planFeature1: 'Trò chuyện và quản lý công việc không giới hạn',
      planFeature2: 'Tự động hóa và nhắc nhở', planFeature3: 'Đồng bộ giữa các thiết bị', planFeature4: 'Hỗ trợ ưu tiên',
      planMissionTitle: 'Sắp ra mắt: vòng lặp chia sẻ',
      planMissionBody: 'Tầm nhìn của chúng tôi là chia sẻ phần lớn doanh thu đăng ký trực tiếp với những người cần giúp đỡ. Tính năng này chưa được kích hoạt — sẽ được thông báo tại đây khi nền tảng pháp lý và tài chính sẵn sàng.',
      planCta: 'Đăng ký', planDemoNote: 'Đây là bản xem trước thiết kế — chưa có khoản thanh toán thực nào được thực hiện.', langLabel: 'Ngôn ngữ', goodNewsTitle: 'Tin tốt hôm nay', goodNewsSubtitle: 'Những tin tức thật, đầy cảm hứng từ khắp thế giới — để bạn mỉm cười.', goodNewsLoading: 'Đang tải…', goodNewsError: 'Hiện chưa thể tải tin tốt — thử lại sau một chút nhé.', onboardHeadline: 'Ứng dụng duy nhất nghĩ cho con người hiện tại và tương lai của bạn — được tạo ra để bạn cảm thấy tốt hơn.', onboardTrial: 'Miễn phí tuần đầu tiên, sau đó chỉ 1 đơn vị tiền tệ của bạn mỗi tháng.', onboardCta: 'Bắt đầu miễn phí', onboardNote: 'Có thể hủy bất cứ lúc nào.', memberCountTitle: 'Gia đình ONE Global', memberCountLoading: 'Đang tải…', memberCountGoalText: 'Khi đạt 1 triệu thành viên, 90% doanh thu hàng tháng sẽ bắt đầu được chia sẻ với những người cần giúp đỡ.', memberCountActiveText: 'Ngay lúc này, 90% doanh thu hàng tháng đang được chia sẻ với những người cần giúp đỡ. Mục tiêu tiếp theo: 1 tỷ thành viên.', planTrialBadge: 'Tuần đầu miễn phí', planTrialLine: 'Miễn phí tuần đầu tiên. Sau đó có thể hủy bất cứ lúc nào.', quickStartTitle: "Bắt đầu nhanh", quickStartSub: "Những gì bạn thực sự có thể làm ngay bây giờ", quickStartChatTitle: "Hỏi ONE Global điều gì đó", quickStartChatDesc: "Nhập vào ô bên dưới để bắt đầu cuộc trò chuyện AI thực sự.", quickStartRoutineTitle: "Thiết lập thói quen hằng ngày của bạn", quickStartRoutineDesc: "Nhận thông báo thực sự theo giờ thức dậy, về nhà và đi ngủ của bạn.", quickStartGo: "Bắt đầu", devicesPreviewTitle: "Điều khiển thiết bị", devicesPreviewSub: "Chưa có — chúng tôi nói thật với bạn", devicesPreviewCardTitle: "ONE Global chưa thể điều khiển thiết bị của bạn", devicesPreviewCardDesc: "Chạm để xem chi tiết và lộ trình",
    },
    th: {
      kicker: 'ปัญญาประดิษฐ์บัญชาการ', greeting: 'สวัสดี', statusReady: 'ทุกระบบพร้อมแล้ว',
      encrypted: 'เข้ารหัสแบบ end-to-end', planPill: 'แผน ONE Global · เพียง 1 หน่วยต่อเดือน', orbReady: 'พร้อม',
      orbSub: 'กำลังฟังอยู่ · บริบทเป็นปัจจุบัน', statDevices: 'อุปกรณ์ที่เชื่อมต่อ', statMemory: 'การอัปเดตความจำ',
      statDone: 'เสร็จสิ้นวันนี้', nowLabel: 'ตอนนี้', live: 'สด', nowTask: 'กำลังเตรียมแผนรายสัปดาห์ของคุณ',
      commandTitle: 'สั่งงาน', commandSub: 'ONE Global เข้าใจว่าต้องทำอะไรและแสดงขอบเขตของมันให้คุณเห็น',
      commandPlaceholder: 'ตัวอย่าง: เตรียมฉันให้พร้อมสำหรับประชุมพรุ่งนี้...', tabAssistant: 'ผู้ช่วย',
      tabAutomations: 'ระบบอัตโนมัติ', tabMemory: 'ความจำ', tabDevices: 'อุปกรณ์', planTitle: 'แผน ONE Global',
      planBack: 'กลับไปที่ผู้ช่วย', planHeadline: 'เพียง 1 หน่วยต่อเดือน ไม่ว่าคุณจะอยู่ที่ไหนในโลก',
      planSub: 'ไม่ว่าคุณจะอาศัยอยู่ที่ไหน ONE Global จะมีราคาเพียง 1 หน่วยของสกุลเงินท้องถิ่นของคุณเสมอ — เข้าถึงได้จริงสำหรับทุกคน',
      planCurrencyLabel: 'เลือกสกุลเงินของคุณ', planCurrencyAuto: 'เราตรวจพบสกุลเงินท้องถิ่นของคุณโดยอัตโนมัติ — คุณสามารถเปลี่ยนได้ตามต้องการ',
      planFeaturesTitle: 'สิ่งที่รวมอยู่ในแผน', planFeature1: 'แชทและจัดการงานได้ไม่จำกัด',
      planFeature2: 'ระบบอัตโนมัติและการแจ้งเตือน', planFeature3: 'ซิงค์ข้ามอุปกรณ์', planFeature4: 'การสนับสนุนแบบมีลำดับความสำคัญ',
      planMissionTitle: 'เร็วๆ นี้: วงจรการแบ่งปัน',
      planMissionBody: 'วิสัยทัศน์ของเราคือการแบ่งปันรายได้จากการสมัครสมาชิกส่วนใหญ่โดยตรงให้กับผู้ที่ต้องการความช่วยเหลือ ฟีเจอร์นี้ยังไม่เปิดใช้งาน — จะประกาศที่นี่เมื่อโครงสร้างทางกฎหมายและการเงินพร้อม',
      planCta: 'สมัครสมาชิก', planDemoNote: 'นี่คือตัวอย่างการออกแบบ — ยังไม่มีการเรียกเก็บเงินจริง', langLabel: 'ภาษา', goodNewsTitle: 'ข่าวดีวันนี้', goodNewsSubtitle: 'ความคืบหน้าที่แท้จริงและให้กำลังใจจากทั่วโลก — เพื่อให้คุณยิ้มได้', goodNewsLoading: 'กำลังโหลด…', goodNewsError: 'ตอนนี้โหลดข่าวดีไม่ได้ — ลองใหม่อีกครั้งในอีกสักครู่', onboardHeadline: 'แอปเดียวที่คิดถึงคุณทั้งวันนี้และอนาคต — สร้างมาเพื่อให้คุณรู้สึกดี', onboardTrial: 'สัปดาห์แรกฟรี จากนั้นเพียง 1 หน่วยสกุลเงินของคุณต่อเดือน', onboardCta: 'เริ่มต้นฟรี', onboardNote: 'ยกเลิกได้ทุกเมื่อ', memberCountTitle: 'ครอบครัว ONE Global', memberCountLoading: 'กำลังโหลด…', memberCountGoalText: 'เมื่อเราถึง 1 ล้านสมาชิก 90% ของรายได้รายเดือนจะเริ่มถูกแบ่งปันให้ผู้ที่ต้องการความช่วยเหลือ', memberCountActiveText: 'ตอนนี้ 90% ของรายได้รายเดือนกำลังถูกแบ่งปันให้ผู้ที่ต้องการความช่วยเหลือ เป้าหมายต่อไปของเรา: 1 พันล้านสมาชิก', planTrialBadge: 'สัปดาห์แรกฟรี', planTrialLine: 'ฟรีสัปดาห์แรก จากนั้นยกเลิกได้ทุกเมื่อ', quickStartTitle: "เริ่มต้นอย่างรวดเร็ว", quickStartSub: "สิ่งที่คุณทำได้จริงตอนนี้", quickStartChatTitle: "ถาม ONE Global สักอย่าง", quickStartChatDesc: "พิมพ์ในช่องด้านล่างเพื่อเริ่มบทสนทนา AI จริง", quickStartRoutineTitle: "ตั้งค่ากิจวัตรประจำวันของคุณ", quickStartRoutineDesc: "รับการแจ้งเตือนจริงตามเวลาตื่นนอน กลับบ้าน และเข้านอนของคุณ", quickStartGo: "เริ่ม", devicesPreviewTitle: "การควบคุมอุปกรณ์", devicesPreviewSub: "ยังไม่มี — เราขอพูดตรง ๆ", devicesPreviewCardTitle: "ONE Global ยังควบคุมอุปกรณ์ของคุณไม่ได้", devicesPreviewCardDesc: "แตะเพื่อดูรายละเอียดและแผนงาน",
    },
    ur: {
      kicker: 'کمانڈ انٹیلیجنس', greeting: 'ہیلو', statusReady: 'تمام نظام تیار ہیں',
      encrypted: 'اینڈ ٹو اینڈ خفیہ کاری', planPill: 'ONE Global پلان · صرف 1 یونٹ ماہانہ', orbReady: 'تیار',
      orbSub: 'سن رہا ہے · سیاق و سباق تازہ ہے', statDevices: 'منسلک آلات', statMemory: 'میموری اپڈیٹس',
      statDone: 'آج مکمل ہوا', nowLabel: 'ابھی', live: 'براہ راست', nowTask: 'آپ کا ہفتہ وار منصوبہ تیار کر رہا ہے',
      commandTitle: 'ایک ہدایت دیں', commandSub: 'ONE Global سمجھتا ہے کہ کیا کرنا ہے اور اپنی حدود دکھاتا ہے۔',
      commandPlaceholder: 'مثال کے طور پر: کل کی میٹنگ کے لیے مجھے تیار کرو...', tabAssistant: 'اسسٹنٹ',
      tabAutomations: 'آٹومیشنز', tabMemory: 'میموری', tabDevices: 'آلات', planTitle: 'ONE Global پلان',
      planBack: 'اسسٹنٹ پر واپس جائیں', planHeadline: 'دنیا میں کہیں بھی، صرف 1 یونٹ ماہانہ',
      planSub: 'آپ کہیں بھی رہیں، ONE Global کی قیمت ہمیشہ آپ کی مقامی کرنسی کا صرف 1 یونٹ ہے — واقعی سب کے لیے قابلِ رسائی۔',
      planCurrencyLabel: 'اپنی کرنسی منتخب کریں', planCurrencyAuto: 'ہم نے آپ کی مقامی کرنسی خود بخود معلوم کر لی ہے — چاہیں تو تبدیل کر سکتے ہیں۔',
      planFeaturesTitle: 'اس میں کیا شامل ہے', planFeature1: 'لامحدود چیٹ اور ٹاسک مینجمنٹ',
      planFeature2: 'آٹومیشنز اور یاد دہانیاں', planFeature3: 'آلات کے درمیان مطابقت پذیری', planFeature4: 'ترجیحی معاونت',
      planMissionTitle: 'جلد آ رہا ہے: شراکت کا دائرہ',
      planMissionBody: 'ہمارا مقصد رکنیت کی آمدنی کا ایک بڑا حصہ براہ راست ضرورت مندوں کے ساتھ بانٹنا ہے۔ یہ خصوصیت ابھی فعال نہیں ہے — قانونی اور مالی بنیاد تیار ہونے پر یہاں اعلان کیا جائے گا۔',
      planCta: 'سبسکرائب کریں', planDemoNote: 'یہ ایک ڈیزائن پیش نظارہ ہے — ابھی تک کوئی حقیقی ادائیگی نہیں لی جا رہی۔', langLabel: 'زبان', goodNewsTitle: 'آج کی اچھی خبریں', goodNewsSubtitle: 'دنیا بھر سے حقیقی، حوصلہ افزا خبریں — آپ کے چہرے پر مسکراہٹ لانے کے لیے۔', goodNewsLoading: 'لوڈ ہو رہا ہے…', goodNewsError: 'ابھی اچھی خبریں لوڈ نہیں ہو سکیں — تھوڑی دیر بعد دوبارہ کوشش کریں۔', onboardHeadline: 'واحد ایپ جو آپ کے آج اور آنے والے کل دونوں کی فکر کرتی ہے — آپ کو اچھا محسوس کرانے کے لیے بنائی گئی۔', onboardTrial: 'پہلا ہفتہ مفت، اس کے بعد ہر ماہ صرف 1 یونٹ آپ کی اپنی کرنسی میں۔', onboardCta: 'مفت شروع کریں', onboardNote: 'کسی بھی وقت منسوخ کر سکتے ہیں۔', memberCountTitle: 'ONE Global خاندان', memberCountLoading: 'لوڈ ہو رہا ہے…', memberCountGoalText: 'جب ہم 10 لاکھ اراکین تک پہنچیں گے، تو ماہانہ آمدنی کا 90% ضرورت مندوں کے ساتھ بانٹا جانا شروع ہو جائے گا۔', memberCountActiveText: 'ابھی، ماہانہ آمدنی کا 90% ضرورت مندوں کے ساتھ بانٹا جا رہا ہے۔ ہمارا اگلا ہدف: 1 ارب اراکین۔', planTrialBadge: 'پہلا ہفتہ مفت', planTrialLine: 'پہلا ہفتہ مفت۔ اس کے بعد کسی بھی وقت منسوخ کریں۔', quickStartTitle: "فوری آغاز", quickStartSub: "ابھی آپ واقعی کیا کر سکتے ہیں", quickStartChatTitle: "ONE Global سے کچھ پوچھیں", quickStartChatDesc: "ایک حقیقی AI گفتگو شروع کرنے کے لیے نیچے دیے گئے خانے میں لکھیں۔", quickStartRoutineTitle: "اپنا روزانہ معمول ترتیب دیں", quickStartRoutineDesc: "اپنے جاگنے، گھر پہنچنے اور سونے کے اوقات کے مطابق حقیقی اطلاعات حاصل کریں۔", quickStartGo: "شروع کریں", devicesPreviewTitle: "ڈیوائس کنٹرول", devicesPreviewSub: "ابھی نہیں — ہم دیانتداری سے بتا رہے ہیں", devicesPreviewCardTitle: "ONE Global ابھی آپ کے آلات کو کنٹرول نہیں کر سکتا", devicesPreviewCardDesc: "تفصیلات اور روڈ میپ کے لیے تھپتھپائیں",
    },
    sw: {
      kicker: 'Akili ya amri', greeting: 'Habari', statusReady: 'Mifumo yote iko tayari',
      encrypted: 'Imesimbwa kwa njia fiche mwanzo hadi mwisho', planPill: 'Mpango wa ONE Global · Kitengo 1 tu kwa mwezi', orbReady: 'Tayari',
      orbSub: 'Inasikiliza · muktadha umesasishwa', statDevices: 'Vifaa vilivyounganishwa', statMemory: 'Masasisho ya kumbukumbu',
      statDone: 'Imekamilika leo', nowLabel: 'Sasa hivi', live: 'Moja kwa moja', nowTask: 'Inaandaa mpango wako wa wiki',
      commandTitle: 'Toa amri', commandSub: 'ONE Global inaelewa la kufanya na inakuonyesha mipaka yake.',
      commandPlaceholder: 'Kwa mfano: Nitayarishe kwa mkutano wa kesho...', tabAssistant: 'Msaidizi',
      tabAutomations: 'Otomatiki', tabMemory: 'Kumbukumbu', tabDevices: 'Vifaa', planTitle: 'Mpango wa ONE Global',
      planBack: 'Rudi kwa Msaidizi', planHeadline: 'Kitengo 1 tu kwa mwezi, popote duniani',
      planSub: 'Popote unapoishi, ONE Global daima inagharimu kitengo 1 tu cha sarafu yako ya eneo — inayoweza kufikiwa kikweli na kila mtu.',
      planCurrencyLabel: 'Chagua sarafu yako', planCurrencyAuto: 'Tumegundua sarafu yako ya eneo kiotomatiki — unaweza kuibadilisha ukitaka.',
      planFeaturesTitle: 'Kilichojumuishwa', planFeature1: 'Mazungumzo na usimamizi wa kazi bila kikomo',
      planFeature2: 'Otomatiki na vikumbusho', planFeature3: 'Usawazishaji kati ya vifaa', planFeature4: 'Msaada wa kipaumbele',
      planMissionTitle: 'Inakuja hivi karibuni: mzunguko wa kugawana',
      planMissionBody: 'Dira yetu ni kugawana sehemu kubwa ya mapato ya usajili moja kwa moja na wenye uhitaji. Kipengele hiki bado hakijawashwa — kitatangazwa hapa mara muundo wa kisheria na kifedha utakapokamilika.',
      planCta: 'Jiandikishe', planDemoNote: 'Huu ni muhtasari wa muundo — hakuna malipo halisi yanayochukuliwa bado.', langLabel: 'Lugha', goodNewsTitle: 'Habari njema za leo', goodNewsSubtitle: 'Maendeleo halisi na ya kutia moyo kutoka duniani kote — ili utabasamu.', goodNewsLoading: 'Inapakia…', goodNewsError: 'Habari njema haziwezi kupakiwa sasa hivi — jaribu tena baada ya muda.', onboardHeadline: 'Programu pekee inayokujali ulivyo sasa na utakavyokuwa — imeundwa kukufanya ujisikie vizuri.', onboardTrial: 'Bure wiki ya kwanza, kisha kitengo 1 tu cha sarafu yako kwa mwezi.', onboardCta: 'Anza Bure', onboardNote: 'Unaweza kughairi wakati wowote.', memberCountTitle: 'Familia ya ONE Global', memberCountLoading: 'Inapakia…', memberCountGoalText: 'Tutakapofikia wanachama milioni 1, 90% ya mapato ya kila mwezi yataanza kugawiwa kwa wenye uhitaji.', memberCountActiveText: 'Sasa hivi, 90% ya mapato ya kila mwezi yanagawiwa kwa wenye uhitaji. Lengo letu lijalo: wanachama bilioni 1.', planTrialBadge: 'Wiki ya kwanza bure', planTrialLine: 'Bure wiki ya kwanza. Baadaye unaweza kughairi wakati wowote.', quickStartTitle: "Anza haraka", quickStartSub: "Unachoweza kufanya kwa kweli sasa hivi", quickStartChatTitle: "Muulize ONE Global kitu", quickStartChatDesc: "Andika kwenye kisanduku hapa chini kuanzisha mazungumzo halisi ya AI.", quickStartRoutineTitle: "Weka ratiba yako ya kila siku", quickStartRoutineDesc: "Pata arifa halisi kulingana na muda wako wa kuamka, kufika nyumbani na kulala.", quickStartGo: "Anza", devicesPreviewTitle: "Udhibiti wa vifaa", devicesPreviewSub: "Bado hakuna — tunakuambia kwa uwazi", devicesPreviewCardTitle: "ONE Global bado haiwezi kudhibiti vifaa vyako", devicesPreviewCardDesc: "Gusa kwa maelezo zaidi na ramani ya njia",
    },
    pl: {
      kicker: 'Inteligencja dowodzenia', greeting: 'Cześć', statusReady: 'Wszystkie systemy gotowe',
      encrypted: 'Szyfrowanie end-to-end', planPill: 'Plan ONE Global · Tylko 1 jednostka miesięcznie', orbReady: 'Gotowy',
      orbSub: 'Słucha · kontekst aktualny', statDevices: 'Połączone urządzenia', statMemory: 'Aktualizacje pamięci',
      statDone: 'Ukończone dzisiaj', nowLabel: 'Teraz', live: 'Na żywo', nowTask: 'Przygotowuje twój plan tygodniowy',
      commandTitle: 'Wydaj polecenie', commandSub: 'ONE Global rozumie, co ma robić, i pokazuje swoje granice.',
      commandPlaceholder: 'Na przykład: Przygotuj mnie na jutrzejsze spotkanie...', tabAssistant: 'Asystent',
      tabAutomations: 'Automatyzacje', tabMemory: 'Pamięć', tabDevices: 'Urządzenia', planTitle: 'Plan ONE Global',
      planBack: 'Powrót do Asystenta', planHeadline: 'Tylko 1 jednostka miesięcznie, w każdym miejscu na świecie',
      planSub: 'Bez względu na to, gdzie mieszkasz, ONE Global zawsze kosztuje tylko 1 jednostkę twojej lokalnej waluty — naprawdę dostępne dla każdego.',
      planCurrencyLabel: 'Wybierz swoją walutę', planCurrencyAuto: 'Automatycznie wykryliśmy twoją lokalną walutę — możesz ją zmienić.',
      planFeaturesTitle: 'Co jest wliczone', planFeature1: 'Nieograniczony czat i zarządzanie zadaniami',
      planFeature2: 'Automatyzacje i przypomnienia', planFeature3: 'Synchronizacja między urządzeniami', planFeature4: 'Priorytetowe wsparcie',
      planMissionTitle: 'Wkrótce: pętla dzielenia się',
      planMissionBody: 'Naszą wizją jest dzielenie się dużą częścią przychodów z subskrypcji bezpośrednio z osobami potrzebującymi. Ta funkcja nie jest jeszcze aktywna — zostanie tu ogłoszona, gdy gotowe będą podstawy prawne i finansowe.',
      planCta: 'Subskrybuj', planDemoNote: 'To jest podgląd projektu — żadna prawdziwa płatność nie jest jeszcze pobierana.', langLabel: 'Język', goodNewsTitle: 'Dzisiejsze dobre wiadomości', goodNewsSubtitle: 'Prawdziwe, budujące wydarzenia z całego świata — żebyś się uśmiechnął.', goodNewsLoading: 'Ładowanie…', goodNewsError: 'Nie udało się teraz wczytać dobrych wiadomości — spróbuj ponownie za chwilę.', onboardHeadline: 'Jedyna aplikacja, która myśli o tobie dzisiaj i w przyszłości — stworzona, by dać ci dobre samopoczucie.', onboardTrial: 'Pierwszy tydzień gratis, potem tylko 1 jednostka twojej własnej waluty miesięcznie.', onboardCta: 'Zacznij za darmo', onboardNote: 'Możesz anulować w każdej chwili.', memberCountTitle: 'Rodzina ONE Global', memberCountLoading: 'Ładowanie…', memberCountGoalText: 'Gdy osiągniemy 1 milion członków, 90% miesięcznych przychodów zacznie być dzielone z potrzebującymi.', memberCountActiveText: 'W tej chwili 90% miesięcznych przychodów jest dzielone z potrzebującymi. Nasz kolejny cel: 1 miliard członków.', planTrialBadge: 'Pierwszy tydzień gratis', planTrialLine: 'Pierwszy tydzień gratis. Potem możesz anulować w każdej chwili.', quickStartTitle: "Szybki start", quickStartSub: "Co naprawdę możesz teraz zrobić", quickStartChatTitle: "Zapytaj ONE Global o coś", quickStartChatDesc: "Wpisz w polu poniżej, aby rozpocząć prawdziwą rozmowę z AI.", quickStartRoutineTitle: "Ustaw swoją codzienną rutynę", quickStartRoutineDesc: "Otrzymuj prawdziwe powiadomienia dopasowane do godzin pobudki, powrotu do domu i snu.", quickStartGo: "Start", devicesPreviewTitle: "Kontrola urządzeń", devicesPreviewSub: "Jeszcze nie — mówimy o tym szczerze", devicesPreviewCardTitle: "ONE Global nie potrafi jeszcze sterować Twoimi urządzeniami", devicesPreviewCardDesc: "Dotknij, aby zobaczyć szczegóły i plan rozwoju",
    },
    nl: {
      kicker: 'Commando-intelligentie', greeting: 'Hallo', statusReady: 'Alle systemen gereed',
      encrypted: 'Eind-tot-eind versleuteld', planPill: 'ONE Global Plan · Slechts 1 eenheid per maand', orbReady: 'Klaar',
      orbSub: 'Luistert · context actueel', statDevices: 'Verbonden apparaten', statMemory: 'Geheugenupdates',
      statDone: 'Vandaag voltooid', nowLabel: 'Op dit moment', live: 'Live', nowTask: 'Bereidt je weekplan voor',
      commandTitle: 'Geef een opdracht', commandSub: 'ONE Global begrijpt wat te doen en laat je zijn grenzen zien.',
      commandPlaceholder: 'Bijvoorbeeld: Bereid me voor op de vergadering van morgen...', tabAssistant: 'Assistent',
      tabAutomations: 'Automatiseringen', tabMemory: 'Geheugen', tabDevices: 'Apparaten', planTitle: 'ONE Global Plan',
      planBack: 'Terug naar Assistent', planHeadline: 'Slechts 1 eenheid per maand, overal ter wereld',
      planSub: 'Waar je ook woont, ONE Global kost altijd maar 1 eenheid van je lokale valuta — echt toegankelijk voor iedereen.',
      planCurrencyLabel: 'Kies je valuta', planCurrencyAuto: 'We hebben je lokale valuta automatisch gedetecteerd — je kunt dit wijzigen.',
      planFeaturesTitle: 'Wat is inbegrepen', planFeature1: 'Onbeperkte chat en taakbeheer',
      planFeature2: 'Automatiseringen en herinneringen', planFeature3: 'Synchronisatie tussen apparaten', planFeature4: 'Prioriteitsondersteuning',
      planMissionTitle: 'Binnenkort: de deelcyclus',
      planMissionBody: 'Onze visie is om een groot deel van de abonnementsinkomsten rechtstreeks te delen met mensen in nood. Deze functie is nog niet actief — wordt hier aangekondigd zodra de juridische en financiële basis klaar is.',
      planCta: 'Abonneren', planDemoNote: 'Dit is een ontwerp preview — er wordt nog geen echte betaling geïnd.', langLabel: 'Taal', goodNewsTitle: 'Het goede nieuws van vandaag', goodNewsSubtitle: 'Echte, hoopvolle ontwikkelingen van over de hele wereld — om je te laten glimlachen.', goodNewsLoading: 'Laden…', goodNewsError: 'Kon het goede nieuws nu niet laden — probeer het zo nog eens.', onboardHeadline: 'De enige app die aan jou denkt — nu en in de toekomst — en je een goed gevoel wil geven.', onboardTrial: 'Gratis de eerste week, daarna slechts 1 eenheid van je eigen valuta per maand.', onboardCta: 'Gratis starten', onboardNote: 'Je kunt altijd opzeggen.', memberCountTitle: 'De ONE Global-familie', memberCountLoading: 'Laden…', memberCountGoalText: 'Zodra we 1 miljoen leden bereiken, wordt 90% van de maandelijkse inkomsten gedeeld met mensen die het nodig hebben.', memberCountActiveText: 'Op dit moment wordt 90% van de maandelijkse inkomsten gedeeld met mensen die het nodig hebben. Ons volgende doel: 1 miljard leden.', planTrialBadge: 'Eerste week gratis', planTrialLine: 'Gratis de eerste week. Daarna kun je altijd opzeggen.', quickStartTitle: "Snelle start", quickStartSub: "Wat je nu echt kunt doen", quickStartChatTitle: "Vraag iets aan ONE Global", quickStartChatDesc: "Typ in het vak hieronder om een echt AI-gesprek te starten.", quickStartRoutineTitle: "Stel je dagelijkse routine in", quickStartRoutineDesc: "Ontvang echte meldingen op basis van je wek-, thuiskomst- en slaaptijden.", quickStartGo: "Start", devicesPreviewTitle: "Apparaatbeheer", devicesPreviewSub: "Nog niet — we zijn er eerlijk over", devicesPreviewCardTitle: "ONE Global kan je apparaten nog niet besturen", devicesPreviewCardDesc: "Tik voor details en de routekaart",
    },
  };

  function getLang() {
    try {
      var saved = localStorage.getItem('one-lang');
      if (saved && STRINGS[saved]) return saved;
    } catch (e) {}
    // First run: guess from browser language.
    try {
      var nav = (navigator.language || 'tr').slice(0, 2).toLowerCase();
      if (STRINGS[nav]) return nav;
    } catch (e) {}
    return 'tr';
  }
  function setLang(lang) {
    try { localStorage.setItem('one-lang', lang); } catch (e) {}
  }
  function langMeta(code) {
    for (var i = 0; i < LANGUAGES.length; i++) if (LANGUAGES[i].code === code) return LANGUAGES[i];
    return LANGUAGES[0];
  }
  function apply(lang) {
    var dict = STRINGS[lang] || STRINGS.tr;
    var meta = langMeta(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    var textEls = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textEls.length; i++) {
      var key = textEls[i].getAttribute('data-i18n');
      if (dict[key]) textEls[i].textContent = dict[key];
    }
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < phEls.length; j++) {
      var pk = phEls[j].getAttribute('data-i18n-placeholder');
      if (dict[pk]) phEls[j].setAttribute('placeholder', dict[pk]);
    }
    var select = document.getElementById('lang-select');
    if (select && select.value !== lang) select.value = lang;
  }
  function populateSelect() {
    var select = document.getElementById('lang-select');
    if (!select || select.dataset.populated) return;
    select.dataset.populated = '1';
    for (var i = 0; i < LANGUAGES.length; i++) {
      var opt = document.createElement('option');
      opt.value = LANGUAGES[i].code;
      opt.textContent = LANGUAGES[i].name;
      select.appendChild(opt);
    }
    select.addEventListener('change', function () {
      setLang(select.value);
      apply(select.value);
    });
  }
  function init() {
    populateSelect();
    apply(getLang());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  global.ONE_I18N = { getLang: getLang, setLang: setLang, apply: apply, LANGUAGES: LANGUAGES };
})(window);
