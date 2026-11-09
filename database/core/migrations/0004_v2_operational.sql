-- MenRut CORE 0004 — Modelo operativo v2 (app nueva, noviembre 2026).
-- Crea las tablas del modelo completo (catálogo territorial, identidad operativa,
-- perfiles, rutas, reputación, membresías/carteras, mensajería, pagos Transfermóvil,
-- moderación) y siembra: geografía oficial, matriz de planes aprobada, herramientas,
-- configuración de pago y mensajeros de demostración (isDemo=1).
-- 100% ADITIVO: no toca las tablas v1 (global_accounts, plans, payment_requests...).
PRAGMA foreign_keys=ON;

-- ─── Catálogo territorial (Cuba) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Province (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, sortOrder INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS Municipality (
  id TEXT PRIMARY KEY, provinceId TEXT NOT NULL REFERENCES Province(id) ON DELETE CASCADE, name TEXT NOT NULL,
  UNIQUE(provinceId, name)
);
CREATE INDEX IF NOT EXISTS idx_municipality_name ON Municipality(name);

-- ─── Identidad y cuentas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, supabaseUserId TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'client', fullName TEXT NOT NULL, phone TEXT, avatarUrl TEXT,
  status TEXT NOT NULL DEFAULT 'active', hasUsedTrial INTEGER NOT NULL DEFAULT 0,
  isDemo INTEGER NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS CourierProfile (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL UNIQUE REFERENCES User(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '', yearsExperience INTEGER NOT NULL DEFAULT 0,
  verificationStatus TEXT NOT NULL DEFAULT 'unverified', isPublic INTEGER NOT NULL DEFAULT 1,
  ratingAvg REAL NOT NULL DEFAULT 0, ratingCount INTEGER NOT NULL DEFAULT 0,
  verifiedDeliveries INTEGER NOT NULL DEFAULT 0, baseFeeCup INTEGER, availabilityNote TEXT NOT NULL DEFAULT '',
  vehicleSummary TEXT NOT NULL DEFAULT '', contactPreference TEXT NOT NULL DEFAULT 'chat',
  coverageType TEXT NOT NULL DEFAULT 'municipal', isDemo INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courierprofile_status_public ON CourierProfile(verificationStatus, isPublic);
CREATE TABLE IF NOT EXISTS CourierService (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  serviceType TEXT NOT NULL, note TEXT, UNIQUE(courierId, serviceType)
);
CREATE TABLE IF NOT EXISTS CourierCoverage (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  municipalityId TEXT NOT NULL REFERENCES Municipality(id) ON DELETE CASCADE,
  UNIQUE(courierId, municipalityId)
);

-- ─── Rutas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Route (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  originMunicipalityId TEXT REFERENCES Municipality(id),
  destinationMunicipalityId TEXT REFERENCES Municipality(id),
  originProvinceId TEXT REFERENCES Province(id), destinationProvinceId TEXT REFERENCES Province(id),
  scope TEXT NOT NULL DEFAULT 'municipal', stops TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'personalizada', daysNote TEXT NOT NULL DEFAULT '',
  serviceType TEXT NOT NULL DEFAULT 'paquetes', vehicleType TEXT NOT NULL DEFAULT 'motor',
  feeCup INTEGER, status TEXT NOT NULL DEFAULT 'active', nextDepartureAt INTEGER,
  notes TEXT NOT NULL DEFAULT '', isDemo INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_route_municipal ON Route(originMunicipalityId, destinationMunicipalityId, status);
CREATE INDEX IF NOT EXISTS idx_route_provincial ON Route(originProvinceId, destinationProvinceId, status);
CREATE INDEX IF NOT EXISTS idx_route_courier ON Route(courierId, status);

-- ─── Reputación ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Review (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  authorId TEXT NOT NULL REFERENCES User(id), rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '', isVerified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'visible', response TEXT, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_courier ON Review(courierId, status);

-- ─── Membresías, planes y créditos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS MembershipPlan (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  durationDays INTEGER NOT NULL, priceCup INTEGER NOT NULL DEFAULT 0,
  permanenceCredits INTEGER NOT NULL DEFAULT 0, toolCredits INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1, isTrial INTEGER NOT NULL DEFAULT 0,
  isProposal INTEGER NOT NULL DEFAULT 1, sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS Membership (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  planId TEXT NOT NULL REFERENCES MembershipPlan(id), startedAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_membership_courier ON Membership(courierId, status);
CREATE TABLE IF NOT EXISTS Wallet (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL UNIQUE REFERENCES CourierProfile(id) ON DELETE CASCADE,
  permanenceCredits INTEGER NOT NULL DEFAULT 0, toolCredits INTEGER NOT NULL DEFAULT 0,
  lastConsumedAt INTEGER, updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS WalletTransaction (
  id TEXT PRIMARY KEY, walletId TEXT NOT NULL REFERENCES Wallet(id) ON DELETE CASCADE,
  walletType TEXT NOT NULL, actorId TEXT, reason TEXT NOT NULL, reference TEXT,
  balanceBefore INTEGER NOT NULL, delta INTEGER NOT NULL, balanceAfter INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wtx_wallet ON WalletTransaction(walletId, createdAt);
CREATE TABLE IF NOT EXISTS Tool (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL DEFAULT 'BÁSICO', minPlanCode TEXT, creditCost INTEGER NOT NULL DEFAULT 0,
  requiresActiveMembership INTEGER NOT NULL DEFAULT 1, isActive INTEGER NOT NULL DEFAULT 1,
  blockedMessage TEXT NOT NULL DEFAULT '', sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);

-- ─── Guardados, mensajes y notificaciones ─────────────────────────────────
CREATE TABLE IF NOT EXISTS Favorite (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE, createdAt INTEGER NOT NULL,
  UNIQUE(userId, courierId)
);
CREATE TABLE IF NOT EXISTS SavedRoute (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  originMunicipalityId TEXT NOT NULL REFERENCES Municipality(id),
  destinationMunicipalityId TEXT NOT NULL REFERENCES Municipality(id),
  label TEXT NOT NULL DEFAULT '', alertsEnabled INTEGER NOT NULL DEFAULT 1, createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS Conversation (
  id TEXT PRIMARY KEY, clientId TEXT NOT NULL REFERENCES User(id), courierId TEXT NOT NULL REFERENCES User(id),
  lastMessageAt INTEGER NOT NULL, createdAt INTEGER NOT NULL, UNIQUE(clientId, courierId)
);
CREATE INDEX IF NOT EXISTS idx_conversation_last ON Conversation(lastMessageAt);
CREATE TABLE IF NOT EXISTS Message (
  id TEXT PRIMARY KEY, conversationId TEXT NOT NULL REFERENCES Conversation(id) ON DELETE CASCADE,
  senderId TEXT NOT NULL REFERENCES User(id), body TEXT NOT NULL, readAt INTEGER, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_message_conv ON Message(conversationId, createdAt);
CREATE TABLE IF NOT EXISTS Notification (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general', title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  readAt INTEGER, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_user ON Notification(userId, readAt);

-- ─── Pagos y verificaciones ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PaymentProof (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  submittedBy TEXT NOT NULL REFERENCES User(id), planId TEXT REFERENCES MembershipPlan(id),
  amountCup INTEGER NOT NULL DEFAULT 0, confirmedAmountCup INTEGER,
  method TEXT NOT NULL DEFAULT 'transfermovil', reference TEXT NOT NULL DEFAULT '',
  proofUrl TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
  reviewNote TEXT, reviewedBy TEXT, reviewedAt INTEGER, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_status ON PaymentProof(status, createdAt);
CREATE TABLE IF NOT EXISTS VerificationRequest (
  id TEXT PRIMARY KEY, courierId TEXT NOT NULL REFERENCES CourierProfile(id) ON DELETE CASCADE,
  documentUrl TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', reviewedBy TEXT, reviewNote TEXT, reviewedAt INTEGER,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verification_status ON VerificationRequest(status, createdAt);

-- ─── Moderación, auditoría y configuración ────────────────────────────────
CREATE TABLE IF NOT EXISTS ReportFlag (
  id TEXT PRIMARY KEY, reporterId TEXT NOT NULL REFERENCES User(id),
  targetType TEXT NOT NULL DEFAULT 'profile', targetId TEXT NOT NULL,
  reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_status ON ReportFlag(status);
CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY, actorId TEXT REFERENCES User(id), action TEXT NOT NULL,
  entityType TEXT NOT NULL, entityId TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON AuditLog(entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog(createdAt);
CREATE TABLE IF NOT EXISTS PlatformConfig (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt INTEGER NOT NULL
);


-- ─── Semilla: geografía oficial (16 provincias / 168 municipios) ──────────
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz4w0000kdquslyhvi6l','pinar-del-r-o','Pinar del Río',0);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz58000nkdqu55f8w9sr','artemisa','Artemisa',1);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz5k001akdqumvxavg7z','la-habana','La Habana',2);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz600025kdqu1odcvfjl','mayabeque','Mayabeque',3);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz69002skdqu3f47flqr','matanzas','Matanzas',4);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz6n003jkdqu2t27ojm5','villa-clara','Villa Clara',5);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz6y004akdqu5gk2xvuf','cienfuegos','Cienfuegos',6);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz75004rkdqua8b8gyio','sancti-sp-ritus','Sancti Spíritus',7);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz7d0058kdquis99oqij','ciego-de-vila','Ciego de Ávila',8);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz7n005tkdquo3ewop2r','camag-ey','Camagüey',9);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz7y006kkdqu8xmiacb0','las-tunas','Las Tunas',10);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz840071kdqub7z0tfnr','holgu-n','Holguín',11);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz8h007ukdqu4s3otsgd','granma','Granma',12);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz9l008lkdqut4qjxkx6','santiago-de-cuba','Santiago de Cuba',13);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwz9v0094kdqu8d22iq1l','guant-namo','Guantánamo',14);
INSERT INTO "Province"(id,code,name,sortOrder) VALUES('cmw7iwza3009pkdqu576xgwaa','isla-de-la-juventud','Isla de la Juventud',15);
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz4z0004kdqumt13a4sh','cmw7iwz4w0000kdquslyhvi6l','Consolación del Sur');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz54000gkdqu64mwwjag','cmw7iwz4w0000kdquslyhvi6l','Guane');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz57000mkdqu3pq1rhfj','cmw7iwz4w0000kdquslyhvi6l','La Palma');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz4z0006kdqutnh89qbq','cmw7iwz4w0000kdquslyhvi6l','Los Palacios');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz52000ckdquaqe9zp3h','cmw7iwz4w0000kdquslyhvi6l','Mantua');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz51000akdqujlk0o8fr','cmw7iwz4w0000kdquslyhvi6l','Minas de Matahambre');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz4y0002kdqu1oufnlr3','cmw7iwz4w0000kdquslyhvi6l','Pinar del Río');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz55000ikdqugjr5syi1','cmw7iwz4w0000kdquslyhvi6l','San Juan y Martínez');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz56000kkdquc14xed34','cmw7iwz4w0000kdquslyhvi6l','San Luis');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz500008kdqum4k8lres','cmw7iwz4w0000kdquslyhvi6l','Sandino');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz53000ekdqu0dvsb89m','cmw7iwz4w0000kdquslyhvi6l','Viñales');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5g0011kdquhjsnnfxg','cmw7iwz58000nkdqu55f8w9sr','Alquízar');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz59000pkdqubz6hzxq1','cmw7iwz58000nkdqu55f8w9sr','Artemisa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5i0015kdquka5xdbzr','cmw7iwz58000nkdqu55f8w9sr','Bahía Honda');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5c000vkdqums5yumg4','cmw7iwz58000nkdqu55f8w9sr','Bauta');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5f000zkdqurt2q9vvi','cmw7iwz58000nkdqu55f8w9sr','Caimito');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5j0017kdquh9xlttnb','cmw7iwz58000nkdqu55f8w9sr','Candelaria');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5a000rkdqut1xhvoep','cmw7iwz58000nkdqu55f8w9sr','Guanajay');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5h0013kdquovpi2gby','cmw7iwz58000nkdqu55f8w9sr','Güira de Melena');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5b000tkdqufjc76pum','cmw7iwz58000nkdqu55f8w9sr','Mariel');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5e000xkdqufjp7nqu2','cmw7iwz58000nkdqu55f8w9sr','San Antonio de los Baños');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5k0019kdqugkuc7jl5','cmw7iwz58000nkdqu55f8w9sr','San Cristóbal');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5p001kkdquyowc82vb','cmw7iwz5k001akdqumvxavg7z','Arroyo Naranjo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5y0022kdquxejoxyy5','cmw7iwz5k001akdqumvxavg7z','Boyeros');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5m001ekdquiemwm2hl','cmw7iwz5k001akdqumvxavg7z','Centro Habana');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5n001gkdqulazkqeza','cmw7iwz5k001akdqumvxavg7z','Cerro');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5z0024kdqut81j29as','cmw7iwz5k001akdqumvxavg7z','Cotorro');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5o001ikdqu6mkwihwv','cmw7iwz5k001akdqumvxavg7z','Diez de Octubre');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5x001ykdqu2jmgvuqe','cmw7iwz5k001akdqumvxavg7z','Guanabacoa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5l001ckdqufcltg9dr','cmw7iwz5k001akdqumvxavg7z','Habana Vieja');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5w001wkdquzq7otw3o','cmw7iwz5k001akdqumvxavg7z','Habana del Este');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5r001okdquqqk43c22','cmw7iwz5k001akdqumvxavg7z','La Lisa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5p001mkdqurexa4nmx','cmw7iwz5k001akdqumvxavg7z','Marianao');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5s001qkdquyd36v8ij','cmw7iwz5k001akdqumvxavg7z','Playa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5u001skdqufx866rdk','cmw7iwz5k001akdqumvxavg7z','Plaza de la Revolución');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5v001ukdqubbp2840m','cmw7iwz5k001akdqumvxavg7z','Regla');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz5x0020kdqur0ihmu2v','cmw7iwz5k001akdqumvxavg7z','San Miguel del Padrón');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz66002pkdquc41i15ez','cmw7iwz600025kdqu1odcvfjl','Batabanó');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz610029kdqus7ox0zey','cmw7iwz600025kdqu1odcvfjl','Bejucal');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz64002lkdqu8miww619','cmw7iwz600025kdqu1odcvfjl','Güines');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz61002bkdquw7vv57z1','cmw7iwz600025kdqu1odcvfjl','Jaruco');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz62002fkdquufo1z8as','cmw7iwz600025kdqu1odcvfjl','Madruga');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz65002nkdqu7a30nb6b','cmw7iwz600025kdqu1odcvfjl','Melena del Sur');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz63002hkdqunokfttu3','cmw7iwz600025kdqu1odcvfjl','Nueva Paz');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz67002rkdquefzgxnpt','cmw7iwz600025kdqu1odcvfjl','Quivicán');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz600027kdqu9ubtq0y1','cmw7iwz600025kdqu1odcvfjl','San José de las Lajas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz64002jkdquwo3jv89q','cmw7iwz600025kdqu1odcvfjl','San Nicolás');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz62002dkdququo72p9a','cmw7iwz600025kdqu1odcvfjl','Santa Cruz del Norte');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6l003gkdqup4hhg6am','cmw7iwz69002skdqu3f47flqr','Calimete');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6j003ckdquxjt3g4qf','cmw7iwz69002skdqu3f47flqr','Ciénaga de Zapata');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6c0030kdquy3g8gti8','cmw7iwz69002skdqu3f47flqr','Colón');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6a002wkdquvw4uqqw0','cmw7iwz69002skdqu3f47flqr','Cárdenas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6k003ekdqu1cd2yxsq','cmw7iwz69002skdqu3f47flqr','Jagüey Grande');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6h0034kdquqdhv9g42','cmw7iwz69002skdqu3f47flqr','Jovellanos');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6i0038kdquxldo5ct3','cmw7iwz69002skdqu3f47flqr','Limonar');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6m003ikdquwil6qxps','cmw7iwz69002skdqu3f47flqr','Los Arabos');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6b002ykdquorvsxubt','cmw7iwz69002skdqu3f47flqr','Martí');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6a002ukdqutum2xw29','cmw7iwz69002skdqu3f47flqr','Matanzas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6i0036kdqujupyof81','cmw7iwz69002skdqu3f47flqr','Pedro Betancourt');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6d0032kdquizq2bjex','cmw7iwz69002skdqu3f47flqr','Perico');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6j003akdquhefrphod','cmw7iwz69002skdqu3f47flqr','Unión de Reyes');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6x0049kdqubgx17fl6','cmw7iwz6n003jkdqu2t27ojm5','Caibarién');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6p003nkdquu1asm07c','cmw7iwz6n003jkdqu2t27ojm5','Camajuaní');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6p003pkdquehl18cb9','cmw7iwz6n003jkdqu2t27ojm5','Cifuentes');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6q003rkdquk0gkwehs','cmw7iwz6n003jkdqu2t27ojm5','Corralillo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6r003tkdqut3gq8kt5','cmw7iwz6n003jkdqu2t27ojm5','Encrucijada');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6s003vkdqudy88v182','cmw7iwz6n003jkdqu2t27ojm5','Manicaragua');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6t003xkdqu03h5olt2','cmw7iwz6n003jkdqu2t27ojm5','Placetas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6t003zkdqu4aevs9c5','cmw7iwz6n003jkdqu2t27ojm5','Quemado de Güines');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6u0041kdquojvpmw1y','cmw7iwz6n003jkdqu2t27ojm5','Ranchuelo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6v0043kdquhzbwvo0s','cmw7iwz6n003jkdqu2t27ojm5','Remedios');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6v0045kdquka3wwl36','cmw7iwz6n003jkdqu2t27ojm5','Sagua la Grande');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6o003lkdquno24h7v8','cmw7iwz6n003jkdqu2t27ojm5','Santa Clara');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6w0047kdqu22mn23df','cmw7iwz6n003jkdqu2t27ojm5','Santo Domingo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz72004mkdqu0uktx16n','cmw7iwz6y004akdqu5gk2xvuf','Abreus');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz73004okdqun4t5d0pg','cmw7iwz6y004akdqu5gk2xvuf','Aguada de Pasajeros');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6y004ckdquxyzplytx','cmw7iwz6y004akdqu5gk2xvuf','Cienfuegos');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6z004ekdqurqtbldux','cmw7iwz6y004akdqu5gk2xvuf','Cruces');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz6z004gkdqudugooii1','cmw7iwz6y004akdqu5gk2xvuf','Cumanayagua');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz74004qkdqurgwswrd2','cmw7iwz6y004akdqu5gk2xvuf','Lajas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz70004ikdqu4dm2sp0k','cmw7iwz6y004akdqu5gk2xvuf','Palmira');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz71004kkdqu50rqcea2','cmw7iwz6y004akdqu5gk2xvuf','Rodas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz78004xkdqu7iua197a','cmw7iwz75004rkdqua8b8gyio','Cabaiguán');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7c0057kdquohjjttna','cmw7iwz75004rkdqua8b8gyio','Fomento');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz79004zkdqukgb3kewo','cmw7iwz75004rkdqua8b8gyio','Jatibonico');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7b0055kdqu3oetf3p6','cmw7iwz75004rkdqua8b8gyio','La Sierpe');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz76004tkdqu83j4asnx','cmw7iwz75004rkdqua8b8gyio','Sancti Spíritus');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7a0053kdqualgss9de','cmw7iwz75004rkdqua8b8gyio','Taguasco');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz77004vkdqu63tz4mxh','cmw7iwz75004rkdqua8b8gyio','Trinidad');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz790051kdqumqtx1b7r','cmw7iwz75004rkdqua8b8gyio','Yaguajay');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7m005skdqubdwh9fpg','cmw7iwz7d0058kdquis99oqij','Baraguá');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7k005okdqus4ea314q','cmw7iwz7d0058kdquis99oqij','Bolivia');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7f005ekdquxqtvg5ho','cmw7iwz7d0058kdquis99oqij','Chambas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7d005akdqush7bhb0u','cmw7iwz7d0058kdquis99oqij','Ciego de Ávila');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7g005gkdquuva7klsd','cmw7iwz7d0058kdquis99oqij','Ciro Redondo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7h005ikdqu5hyaca4e','cmw7iwz7d0058kdquis99oqij','Florencia');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7i005kkdqu9sclvq36','cmw7iwz7d0058kdquis99oqij','Majagua');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7e005ckdqumqgwkdma','cmw7iwz7d0058kdquis99oqij','Morón');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7j005mkdqu3uuowqvk','cmw7iwz7d0058kdquis99oqij','Primero de Enero');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7l005qkdqukoowio5r','cmw7iwz7d0058kdquis99oqij','Venezuela');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7n005vkdquzvvepno1','cmw7iwz7n005tkdquo3ewop2r','Camagüey');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7x006jkdqu28b9i8xp','cmw7iwz7n005tkdquo3ewop2r','Carlos Manuel de Céspedes');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7t0069kdquvxdtk6og','cmw7iwz7n005tkdquo3ewop2r','Esmeralda');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7o005xkdquy5e4idj9','cmw7iwz7n005tkdquo3ewop2r','Florida');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7q0061kdquvpanj7c6','cmw7iwz7n005tkdquo3ewop2r','Guáimaro');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7w006fkdqu1ca85odg','cmw7iwz7n005tkdquo3ewop2r','Jimaguayú');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7s0067kdquur41tpk3','cmw7iwz7n005tkdquo3ewop2r','Minas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7w006hkdqurzqivxr6','cmw7iwz7n005tkdquo3ewop2r','Najasa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7p005zkdquq2x4txkc','cmw7iwz7n005tkdquo3ewop2r','Nuevitas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7s0065kdqu74q2rqej','cmw7iwz7n005tkdquo3ewop2r','Santa Cruz del Sur');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7r0063kdqu717te9ky','cmw7iwz7n005tkdquo3ewop2r','Sibanicú');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7u006bkdqu1yc3r797','cmw7iwz7n005tkdquo3ewop2r','Sierra de Cubitas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7v006dkdqu5fqziv1d','cmw7iwz7n005tkdquo3ewop2r','Vertientes');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz80006qkdquex2se31v','cmw7iwz7y006kkdqu8xmiacb0','Amancio');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz81006skdquyqrwnool','cmw7iwz7y006kkdqu8xmiacb0','Colombia');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz830070kdquoiu8jduu','cmw7iwz7y006kkdqu8xmiacb0','Jesús Menéndez');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz81006ukdqukhxfxxsm','cmw7iwz7y006kkdqu8xmiacb0','Jobabo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7y006mkdquoisa9t0s','cmw7iwz7y006kkdqu8xmiacb0','Las Tunas');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz82006wkdqugo7fbdnn','cmw7iwz7y006kkdqu8xmiacb0','Majibacoa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz83006ykdqulwieihqh','cmw7iwz7y006kkdqu8xmiacb0','Manatí');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz7z006okdqu9za0my84','cmw7iwz7y006kkdqu8xmiacb0','Puerto Padre');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz860077kdquqseranv3','cmw7iwz840071kdqub7z0tfnr','Antilla');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz850075kdqu7zhnyboi','cmw7iwz840071kdqub7z0tfnr','Banes');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz870079kdqupdihoy8g','cmw7iwz840071kdqub7z0tfnr','Báguanos');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8h007tkdquaelpage5','cmw7iwz840071kdqub7z0tfnr','Cacocum');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8e007pkdquyz5tase9','cmw7iwz840071kdqub7z0tfnr','Calixto García');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz88007bkdquz31ckgqa','cmw7iwz840071kdqub7z0tfnr','Cueto');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz89007dkdqu4b4mwyxg','cmw7iwz840071kdqub7z0tfnr','Frank País');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8a007fkdqubx73am7h','cmw7iwz840071kdqub7z0tfnr','Gibara');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz850073kdquvoow5hv4','cmw7iwz840071kdqub7z0tfnr','Holguín');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8c007lkdquawlrkq5o','cmw7iwz840071kdqub7z0tfnr','Mayarí');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8d007nkdqugm4oe218','cmw7iwz840071kdqub7z0tfnr','Moa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8b007hkdquve0659l6','cmw7iwz840071kdqub7z0tfnr','Rafael Freyre');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8b007jkdquv2zofdwa','cmw7iwz840071kdqub7z0tfnr','Sagua de Tánamo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8f007rkdquo7zbg0f1','cmw7iwz840071kdqub7z0tfnr','Urbano Noris');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9k008kkdqu7tl8jmji','cmw7iwz8h007ukdqu4s3otsgd','Bartolomé Masó');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8i007wkdqu2paodmvg','cmw7iwz8h007ukdqu4s3otsgd','Bayamo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9j008gkdquafsr34k4','cmw7iwz8h007ukdqu4s3otsgd','Buey Arriba');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9g0088kdqub68hqp7s','cmw7iwz8h007ukdqu4s3otsgd','Campechuela');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9i008ekdqudtyzq6tz','cmw7iwz8h007ukdqu4s3otsgd','Cauto Cristo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9k008ikdqu8vlq7zmj','cmw7iwz8h007ukdqu4s3otsgd','Guisa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9a0080kdquiwh0d28b','cmw7iwz8h007ukdqu4s3otsgd','Jiguaní');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz8j007ykdquhzgbhiak','cmw7iwz8h007ukdqu4s3otsgd','Manzanillo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9d0086kdquntvz8f68','cmw7iwz8h007ukdqu4s3otsgd','Media Luna');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9c0084kdqu425shld7','cmw7iwz8h007ukdqu4s3otsgd','Niquero');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9b0082kdqu1oepg3ly','cmw7iwz8h007ukdqu4s3otsgd','Pilón');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9i008ckdqu5o8f7gxz','cmw7iwz8h007ukdqu4s3otsgd','Río Cauto');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9h008akdquazt3s8vy','cmw7iwz8h007ukdqu4s3otsgd','Yara');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9n008rkdqu0spwzr96','cmw7iwz9l008lkdqut4qjxkx6','Contramaestre');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9t0091kdquokd4an02','cmw7iwz9l008lkdqut4qjxkx6','Guamá');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9r008xkdqu7pb1htud','cmw7iwz9l008lkdqut4qjxkx6','Mella');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9n008pkdqu08ckm7sc','cmw7iwz9l008lkdqut4qjxkx6','Palma Soriano');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9p008tkdquqdbnfb22','cmw7iwz9l008lkdqut4qjxkx6','San Luis');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9l008nkdqu4chofnyn','cmw7iwz9l008lkdqut4qjxkx6','Santiago de Cuba');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9t008zkdquwzcms6f1','cmw7iwz9l008lkdqut4qjxkx6','Segundo Frente');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9q008vkdquhhtuvts6','cmw7iwz9l008lkdqut4qjxkx6','Songo-La Maya');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9u0093kdqu9e3mi5ca','cmw7iwz9l008lkdqut4qjxkx6','Tercer Frente');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9w0098kdqu3yp7ordq','cmw7iwz9v0094kdqu8d22iq1l','Baracoa');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9z009gkdqusvp06dqi','cmw7iwz9v0094kdqu8d22iq1l','Caimanera');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwza1009kkdquva7ax0p5','cmw7iwz9v0094kdqu8d22iq1l','El Salvador');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9w0096kdqunbyak7zt','cmw7iwz9v0094kdqu8d22iq1l','Guantánamo');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9y009ckdqufhh2s2qu','cmw7iwz9v0094kdqu8d22iq1l','Imías');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9x009akdqu24q9w4jx','cmw7iwz9v0094kdqu8d22iq1l','Maisí');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwza2009mkdquxg27xct4','cmw7iwz9v0094kdqu8d22iq1l','Manuel Tames');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwza0009ikdquli4kbqov','cmw7iwz9v0094kdqu8d22iq1l','Niceto Pérez');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwz9y009ekdqu1aq9067a','cmw7iwz9v0094kdqu8d22iq1l','San Antonio del Sur');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwza2009okdqug82thngz','cmw7iwz9v0094kdqu8d22iq1l','Yateras');
INSERT INTO "Municipality"(id,provinceId,name) VALUES('cmw7iwza4009rkdqu02v16x07','cmw7iwza3009pkdqu576xgwaa','Isla de la Juventud');

-- ─── Semilla: matriz de planes aprobada (prueba + básico/profesional/destacado) ──
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw7iwza7009skdqugh7aqp30','prueba','Prueba gratuita','7 días para conocer la plataforma. Se ofrece una sola vez por cuenta.',7,0,70,0,1,1,0,0,1794123679903,1794205702996);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw7iwza8009tkdquxwuy45sx','mensual','Mensual','Un mes de visibilidad completa del pasaporte.',30,500,300,20,0,0,0,1,1794123679904,1794205703007);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pg009tslcogqg153ni','basic-1m','Básico 1 mes','Pasaporte visible 30 días y 100 créditos de herramientas.',30,1500,300,100,1,0,0,1,1794205702997,1794205702997);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw7iwza9009ukdquazunnqw3','trimestral','Trimestral','Tres meses de permanencia con descuento.',90,1350,900,70,0,0,1,2,1794123679905,1794205703007);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0ph009uslco6l3h5mmj','basic-3m','Básico 3 meses','Pasaporte visible 90 días y 100 créditos de herramientas, con descuento.',90,4200,900,100,1,0,0,2,1794205702998,1794205702998);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzaa009vkdqu5do6r846','anual','Anual','Un año completo, la mejor relación costo-beneficio.',365,4800,3650,320,0,0,1,3,1794123679906,1794205703008);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pi009vslco074098xp','basic-6m','Básico 6 meses','Medio año de visibilidad del pasaporte y 100 créditos de herramientas.',180,7500,1800,100,1,0,0,3,1794205702998,1794205702998);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pj009wslcocgcq1ff9','basic-12m','Básico 12 meses','Un año de visibilidad del pasaporte y 100 créditos de herramientas, la mejor relación costo-beneficio.',365,13500,3650,100,1,0,0,4,1794205702999,1794205702999);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pk009xslcovkmsxage','pro-1m','Profesional 1 mes','Prioridad en resultados y 350 créditos de herramientas durante 30 días.',30,2500,300,350,1,0,0,5,1794205703000,1794205703000);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pk009yslcouk93fbx9','pro-3m','Profesional 3 meses','Prioridad en resultados y 350 créditos de herramientas durante 90 días.',90,6900,900,350,1,0,0,6,1794205703001,1794205703001);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pl009zslcojmpgqdoq','pro-6m','Profesional 6 meses','Prioridad en resultados y 350 créditos de herramientas durante 180 días.',180,12000,1800,350,1,0,0,7,1794205703002,1794205703002);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pm00a0slcoijncpk0u','pro-12m','Profesional 12 meses','Un año con prioridad en resultados y 350 créditos de herramientas.',365,21000,3650,350,1,0,0,8,1794205703003,1794205703003);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pn00a1slcorxtw8xe4','featured-1m','Destacado 1 mes','Perfil destacado en búsquedas y 700 créditos de herramientas durante 30 días.',30,4000,300,700,1,0,0,9,1794205703004,1794205703004);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0po00a2slcojtd3v7fl','featured-3m','Destacado 3 meses','Perfil destacado en búsquedas y 700 créditos de herramientas durante 90 días.',90,10800,900,700,1,0,0,10,1794205703004,1794205703004);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pp00a3slcoc1sip2i5','featured-6m','Destacado 6 meses','Medio año con perfil destacado y 700 créditos de herramientas.',180,19200,1800,700,1,0,0,11,1794205703005,1794205703005);
INSERT INTO "MembershipPlan"(id,code,name,description,durationDays,priceCup,permanenceCredits,toolCredits,isActive,isTrial,isProposal,sortOrder,createdAt,updatedAt) VALUES('cmw8vr0pp00a4slcob69uimit','featured-12m','Destacado 12 meses','Un año con perfil destacado y 700 créditos de herramientas.',365,34800,3650,700,1,0,0,12,1794205703006,1794205703006);

-- ─── Semilla: herramientas con etiquetas ────────────────────────────────
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzab009wkdquwueabkmj','publicar-rutas','Publicar rutas','Publica y mantiene activas tus rutas en el directorio.','GRATUITA',NULL,0,1,1,'Disponible con cualquier membresía activa.',0,1794123679907,1794205703008);
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzab009xkdquize9i6gl','anuncio-recorrido','Anunciar próximo recorrido','Anuncia una salida futura para que clientes de esa ruta te encuentren.','BÁSICO','basic-1m',1,1,1,'Requiere plan Básico o superior.',1,1794123679908,1794205703009);
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzac009ykdqugcq3zzie','estadisticas-avanzadas','Estadísticas avanzadas','Vistas, búsquedas y contactos recibidos por ruta.','PRO','pro-1m',1,1,1,'Requiere plan Profesional o superior.',2,1794123679909,1794205703010);
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzad009zkdqur7qc07m7','prioridad-resultados','Prioridad en resultados','Tu pasaporte aparece antes en búsquedas de tus rutas.','PRO','pro-3m',2,1,1,'Requiere plan Profesional 3 meses o superior.',3,1794123679909,1794205703011);
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7iwzad00a0kdqucexfxf9q','destacar-perfil','Destacar perfil','Tu pasaporte se destaca visualmente en resultados y rutas populares.','DESTACADO','featured-1m',3,1,1,'Requiere plan Destacado o superior.',4,1794123679910,1794205703012);
INSERT INTO "Tool"(id,code,name,description,tag,minPlanCode,creditCost,requiresActiveMembership,isActive,blockedMessage,sortOrder,createdAt,updatedAt) VALUES('cmw7k1e2c002nkdj0474ie89r','destacado','Destacar pasaporte','Aumenta la visibilidad del pasaporte una semana.','DESTACADO','mensual',15,1,1,'Requiere plan Mensual o superior.',6,1794125565301,1794125565301);

-- ─── Semilla: configuración de la plataforma (pago Transfermóvil real) ──
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('trial_days','7',1794205703013);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('trial_permanence_credits','70',1794205703013);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('credits_per_12h','5',1794205703014);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('credits_per_24h','10',1794205703014);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('renewal_mode','add',1794205703015);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('tool_credits_expiry_mode','carry',1794205703015);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('search_radius_alternatives','1',1794205703016);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('app_slogan','Conectamos caminos.',1794206475826);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('support_phone','+53 55500000',1794125564124);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('maintenance_mode','false',1794125564125);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('payment_method','Transfermóvil',1794205703017);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('payment_card','9205-0699-9403-1473',1794206475534);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('payment_phone','+53 52678747',1794205703019);
INSERT INTO "PlatformConfig"(key,value,updatedAt) VALUES('payment_note','Transfiere el importe exacto por Transfermóvil a la tarjeta indicada y conserva la captura de la operación. El propietario confirma la recepción antes de activar tu plan.',1794205703019);

-- ─── Semilla: mensajeros de demostración (isDemo=1, sin acceso real) ───
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzaj00a1kdqufxs9k6t2','demo.luis@menrut.demo',NULL,'courier','Luis Martínez','+53 5xxxxxxx1',NULL,'active',1,1,1794123679915,1794123679915);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzay00akkdqu4aoifv5n','demo.ana@menrut.demo',NULL,'courier','Ana Rodríguez','+53 5xxxxxxx2',NULL,'active',1,1,1794123679930,1794123679930);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzba00b2kdqulr00n927','demo.carlos@menrut.demo',NULL,'courier','Carlos Pérez','+53 5xxxxxxx3',NULL,'active',1,1,1794123679942,1794123679942);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzca00bhkdqunei1urlj','demo.maria@menrut.demo',NULL,'courier','María Fernández','+53 5xxxxxxx4',NULL,'active',1,1,1794123679978,1794123679978);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcm00bykdqu26gng8ks','demo.jose@menrut.demo',NULL,'courier','José Antonio Ruiz','+53 5xxxxxxx5',NULL,'active',1,1,1794123679990,1794123679990);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcu00cckdquwhha03bv','demo.yudith@menrut.demo',NULL,'courier','Yudith González','+53 5xxxxxxx6',NULL,'active',1,1,1794123679998,1794123679998);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzd400ctkdqu90y9h4y8','demo.reinaldo@menrut.demo',NULL,'courier','Reinaldo Casanova','+53 5xxxxxxx7',NULL,'active',1,1,1794123680009,1794123680009);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw7iwzde00dakdqumra6sl60','demo.damarys@menrut.demo',NULL,'courier','Damarys León','+53 5xxxxxxx8',NULL,'active',1,1,1794123680019,1794123680019);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qd00aaslco6fc7f1sp','demo.osmany@menrut.demo',NULL,'courier','Osmany Vega','+53 5xxxxxxx9',NULL,'active',1,1,1794205703030,1794205703030);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qi00ajslco5ngteos4','demo.ernesto@menrut.demo',NULL,'courier','Ernesto Navarro','+53 5xxxxxx10',NULL,'active',1,1,1794205703034,1794205703034);
INSERT INTO "User"(id,email,supabaseUserId,role,fullName,phone,avatarUrl,status,hasUsedTrial,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qv00b0slcone47nndo','demo.yoandis@menrut.demo',NULL,'courier','Yoandis Peña','+53 5xxxxxx11',NULL,'active',1,1,1794205703048,1794205703048);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwzaj00a1kdqufxs9k6t2','Más de 5 años conectando destinos. Responsable, puntual y confiable. Especialista en paquetes entre la capital y Matanzas.',5,'verified',1,4.9,248,96,150,'Lunes a viernes, salidas por la mañana','Auto Peugeot 301','chat','municipal',1,1794123679916,1794123679916);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzay00amkdqu503daoto','cmw7iwzay00akkdqu4aoifv5n','Mensajera full-time. Manejo cuidadoso de documentos y paquetes frágiles. Rutas frecuentes al este del país.',3,'verified',1,4.8,192,71,90,'Todos los días, 8:00 a 18:00','Motor Honda','chat','municipal',1,1794123679931,1794123679931);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzbb00b4kdquy7pa70pf','cmw7iwzba00b2kdqulr00n927','Encargos y entregas comerciales entre provincias centrales. Camión con capacidad para cargas medianas.',8,'pending',1,4.7,130,45,300,'Salidas programadas, consultar','Camión Kia','chat','municipal',1,1794123679943,1794123679943);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzca00bjkdqubpzpmzh6','cmw7iwzca00bhkdqunei1urlj','Conecto el oriente del país. Rutas Santiago–Holguín con salidas casi diarias. Referencias verificables.',6,'verified',1,4.9,315,140,200,'De lunes a sábado','Auto Geely','chat','municipal',1,1794123679979,1794123679979);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcm00c0kdquanvctsg4','cmw7iwzcm00bykdqu26gng8ks','Paquetes y encargos en el occidente. Cobertura Pinar del Río y Artemisa, con paradas intermedias.',4,'unverified',1,4.5,87,22,80,'Martes, jueves y sábados','Motor Yamaha','chat','municipal',1,1794123679991,1794123679991);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwzcu00cckdquwhha03bv','Especialista en entregas comerciales para negocios. Facturación y comprobante de entrega.',7,'verified',1,4.8,156,98,250,'Horario comercial','Panel Toyota','chat','municipal',1,1794123679999,1794123679999);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzd500cvkdqur12c9kf8','cmw7iwzd400ctkdqu90y9h4y8','Rutas centrales y camagüeyanas. Cargas grandes con embalaje seguro.',10,'verified',1,4.6,64,18,400,'Salidas quincenales','Camión Isuzu','chat','municipal',1,1794123680009,1794126613154);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw7iwzdf00dckdquyzjzzse9','cmw7iwzde00dakdqumra6sl60','Mensajería rápida dentro de La Habana. Entregas el mismo día para documentos y paquetes pequeños.',2,'verified',1,5.0,41,30,50,'Todos los días, 9:00 a 20:00','Bicicleta eléctrica','chat','zone',1,1794123680019,1794205703028);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qe00acslcokirny4ab','cmw8vr0qd00aaslco6fc7f1sp','Mensajero de zona en Santa Clara. Entregas el mismo día dentro del municipio: documentos, encargos y paquetes pequeños.',3,'verified',1,4.7,78,40,60,'Lunes a sábado, 8:00 a 18:00','Motor Suzuki','chat','zone',1,1794205703031,1794205703031);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qj00alslco31e0f6c2','cmw8vr0qi00ajslco5ngteos4','Mensajero provincial: viajes La Habana–Villa Clara–Holguín con salidas regulares. Carga y paquetes con embalaje seguro.',9,'verified',1,4.8,210,95,500,'Salidas lunes, miércoles y viernes','Camión Mercedes','chat','provincial',1,1794205703036,1794205703036);
INSERT INTO "CourierProfile"(id,userId,bio,yearsExperience,verificationStatus,isPublic,ratingAvg,ratingCount,verifiedDeliveries,baseFeeCup,availabilityNote,vehicleSummary,contactPreference,coverageType,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qx00b2slco8zp9r8hx','cmw8vr0qv00b0slcone47nndo','Conecto el occidente: Pinar del Río, Artemisa y La Habana. Encargos y paquetes con confirmación de entrega.',5,'pending',1,4.6,122,44,350,'Martes y sábados','Panel Ford','chat','provincial',1,1794205703049,1794205703049);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzaj00a5kdqu2ucce5e8','cmw7iwzaj00a3kdqutgzlu2i7','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzaj00a4kdquy4ykz0js','cmw7iwzaj00a3kdqutgzlu2i7','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzaz00aokdqudbx1p7ot','cmw7iwzay00amkdqu503daoto','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzaz00apkdqudm9drogb','cmw7iwzay00amkdqu503daoto','entregas_comerciales',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzaz00ankdquym3vjfd2','cmw7iwzay00amkdqu503daoto','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzbb00b5kdqug5v58012','cmw7iwzbb00b4kdquy7pa70pf','entregas_comerciales',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzbb00b6kdqu2761uc36','cmw7iwzbb00b4kdquy7pa70pf','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzca00blkdqu5m8ewqdg','cmw7iwzca00bjkdqubpzpmzh6','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzca00bkkdquf739ob8i','cmw7iwzca00bjkdqubpzpmzh6','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzcm00c1kdqu5zle2w9g','cmw7iwzcm00c0kdquanvctsg4','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzcv00cfkdquy7555jkt','cmw7iwzcv00cekdqu9sk1fhsy','entregas_comerciales',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzcv00cgkdqubyq8mn1p','cmw7iwzcv00cekdqu9sk1fhsy','otros',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzd500cxkdqufcsbdga0','cmw7iwzd500cvkdqur12c9kf8','otros',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzd500cwkdqudn5lo9ny','cmw7iwzd500cvkdqur12c9kf8','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzdf00dekdquauzd8mc0','cmw7iwzdf00dckdquyzjzzse9','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw7iwzdf00ddkdquvuudm4tb','cmw7iwzdf00dckdquyzjzzse9','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qe00aeslcobfclru6n','cmw8vr0qe00acslcokirny4ab','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qe00adslcoq5cq4wq7','cmw8vr0qe00acslcokirny4ab','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qj00anslcoanbbb4iz','cmw8vr0qj00alslco31e0f6c2','entregas_comerciales',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qj00amslcogs41vh6s','cmw8vr0qj00alslco31e0f6c2','paquetes',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qx00b4slcojjlxlyus','cmw8vr0qx00b2slco8zp9r8hx','encargos',NULL);
INSERT INTO "CourierService"(id,courierId,serviceType,note) VALUES('cmw8vr0qx00b3slcoyr7eqgsl','cmw8vr0qx00b2slco8zp9r8hx','paquetes',NULL);
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzan00a7kdqu07m2vo3n','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz5s001qkdquyd36v8ij');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzao00a9kdquxamktg5a','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz5y0022kdquxejoxyy5');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzaq00abkdquri02o80f','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz6a002ukdqutum2xw29');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzar00adkdquu7zmkl3b','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz6a002wkdquvw4uqqw0');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzb200atkdqu8qp2qupf','cmw7iwzay00amkdqu503daoto','cmw7iwz5l001ckdqufcltg9dr');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzb000arkdqufj55anmw','cmw7iwzay00amkdqu503daoto','cmw7iwz5m001ekdquiemwm2hl');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzb400avkdquwq3pancg','cmw7iwzay00amkdqu503daoto','cmw7iwz5o001ikdqu6mkwihwv');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzc700bckdqub8fce0w7','cmw7iwzbb00b4kdquy7pa70pf','cmw7iwz6a002ukdqutum2xw29');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzbc00b8kdqukha1okvr','cmw7iwzbb00b4kdquy7pa70pf','cmw7iwz6o003lkdquno24h7v8');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzc500bakdqunh9d8kw9','cmw7iwzbb00b4kdquy7pa70pf','cmw7iwz6y004ckdquxyzplytx');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzce00bpkdqu5zxpidme','cmw7iwzca00bjkdqubpzpmzh6','cmw7iwz850073kdquvoow5hv4');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcf00brkdquk6jomk73','cmw7iwzca00bjkdqubpzpmzh6','cmw7iwz8i007wkdqu2paodmvg');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcc00bnkdqu4j95rowz','cmw7iwzca00bjkdqubpzpmzh6','cmw7iwz9l008nkdqu4chofnyn');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzco00c3kdquov13659t','cmw7iwzcm00c0kdquanvctsg4','cmw7iwz4y0002kdqu1oufnlr3');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcq00c5kdqumuf5j7to','cmw7iwzcm00c0kdquanvctsg4','cmw7iwz59000pkdqubz6hzxq1');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcr00c7kdquz5dkeu7o','cmw7iwzcm00c0kdquanvctsg4','cmw7iwz5r001okdquqqk43c22');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcy00ckkdquk3y5td6e','cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwz5p001mkdqurexa4nmx');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzcw00cikdqup5yxug7s','cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwz5s001qkdquyd36v8ij');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzd000cmkdqug3vwad28','cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwz5y0022kdquxejoxyy5');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzd100cokdquicut3fk4','cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwz600027kdqu9ubtq0y1');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzd800d1kdquzx59pjqd','cmw7iwzd500cvkdqur12c9kf8','cmw7iwz7d005akdqush7bhb0u');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzd600czkdquvq08czp0','cmw7iwzd500cvkdqur12c9kf8','cmw7iwz7n005vkdquzvvepno1');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzd900d3kdquauk6tgo7','cmw7iwzd500cvkdqur12c9kf8','cmw7iwz7y006mkdquoisa9t0s');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzdk00dmkdquzwqcmq7i','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5l001ckdqufcltg9dr');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzdj00dkkdqukz76mv44','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5m001ekdquiemwm2hl');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzdl00dokdqut60tg9vy','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5n001gkdqulazkqeza');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzdg00dgkdqujy3bppme','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5s001qkdquyd36v8ij');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw7iwzdh00dikdqung4hx5co','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5u001skdqufx866rdk');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0qg00agslcoafkuxxsy','cmw8vr0qe00acslcokirny4ab','cmw7iwz6o003lkdquno24h7v8');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0ql00apslcowtfd8p7s','cmw8vr0qj00alslco31e0f6c2','cmw7iwz5s001qkdquyd36v8ij');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0qm00arslcoqsqy3vbi','cmw8vr0qj00alslco31e0f6c2','cmw7iwz6o003lkdquno24h7v8');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0qo00atslcomvmsbyoh','cmw8vr0qj00alslco31e0f6c2','cmw7iwz850073kdquvoow5hv4');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0qz00b6slcodxqsagrf','cmw8vr0qx00b2slco8zp9r8hx','cmw7iwz4y0002kdqu1oufnlr3');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0r100b8slcos58vppx6','cmw8vr0qx00b2slco8zp9r8hx','cmw7iwz59000pkdqubz6hzxq1');
INSERT INTO "CourierCoverage"(id,courierId,municipalityId) VALUES('cmw8vr0r200baslco83vp43u6','cmw8vr0qx00b2slco8zp9r8hx','cmw7iwz5s001qkdquyd36v8ij');
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzau00afkdqu73l5p7im','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz5s001qkdquyd36v8ij','cmw7iwz6a002ukdqutum2xw29',NULL,NULL,'municipal','','diaria','Lunes a viernes','paquetes','auto',150,'active',NULL,'',1,1794123679926,1794123679926);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzaw00ahkdqu1uxaifjx','cmw7iwzaj00a3kdqutgzlu2i7','cmw7iwz5y0022kdquxejoxyy5','cmw7iwz6a002wkdquvw4uqqw0',NULL,NULL,'municipal','','semanal','Viernes','paquetes','auto',180,'scheduled',NULL,'',1,1794123679928,1794123679928);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzb600axkdqu63yc455y','cmw7iwzay00amkdqu503daoto','cmw7iwz5m001ekdquiemwm2hl','cmw7iwz5s001qkdquyd36v8ij',NULL,NULL,'municipal','','diaria','Todos los días','paquetes','motor',60,'active',NULL,'',1,1794123679938,1794123679938);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzb900azkdqumhqtsgyj','cmw7iwzay00amkdqu503daoto','cmw7iwz5l001ckdqufcltg9dr','cmw7iwz64002lkdqu8miww619',NULL,NULL,'municipal','San José de las Lajas','semanal','Martes y jueves','paquetes','motor',120,'active',NULL,'',1,1794123679941,1794123679941);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzc900bekdqut8zpx9hl','cmw7iwzbb00b4kdquy7pa70pf','cmw7iwz6a002ukdqutum2xw29','cmw7iwz6o003lkdquno24h7v8',NULL,NULL,'municipal','Cienfuegos','semanal','Lunes','paquetes','camion',350,'active',NULL,'',1,1794123679977,1794123679977);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcj00btkdquxnik27v1','cmw7iwzca00bjkdqubpzpmzh6','cmw7iwz9l008nkdqu4chofnyn','cmw7iwz850073kdquvoow5hv4',NULL,NULL,'municipal','','diaria','Lunes a sábado','paquetes','auto',200,'active',NULL,'',1,1794123679987,1794123679987);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcl00bvkdqu4dwnbhmz','cmw7iwzca00bjkdqubpzpmzh6','cmw7iwz9l008nkdqu4chofnyn','cmw7iwz8i007wkdqu2paodmvg',NULL,NULL,'municipal','','diaria','Lunes a sábado','paquetes','auto',220,'active',NULL,'',1,1794123679989,1794123679989);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzcs00c9kdquhk5r45i1','cmw7iwzcm00c0kdquanvctsg4','cmw7iwz4y0002kdqu1oufnlr3','cmw7iwz5r001okdquqqk43c22',NULL,NULL,'municipal','Artemisa','semanal','Martes, jueves y sábado','paquetes','motor',250,'active',NULL,'',1,1794123679997,1794123679997);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzd300cqkdquqrqy6krf','cmw7iwzcv00cekdqu9sk1fhsy','cmw7iwz5s001qkdquyd36v8ij','cmw7iwz600027kdqu9ubtq0y1',NULL,NULL,'municipal','','diaria','Lunes a viernes','paquetes','panel',130,'active',NULL,'',1,1794123680008,1794123680008);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzdb00d5kdquwnptk9c4','cmw7iwzd500cvkdqur12c9kf8','cmw7iwz7n005vkdquzvvepno1','cmw7iwz7d005akdqush7bhb0u',NULL,NULL,'municipal','','semanal','Cada 15 días','paquetes','camion',400,'scheduled',NULL,'',1,1794123680015,1794123680015);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzdd00d7kdqu5uy35ebx','cmw7iwzd500cvkdqur12c9kf8','cmw7iwz7n005vkdquzvvepno1','cmw7iwz7y006mkdquoisa9t0s',NULL,NULL,'municipal','','semanal','Cada 15 días','paquetes','camion',480,'scheduled',NULL,'',1,1794123680017,1794123680017);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw7iwzdn00dqkdququs8ctxj','cmw7iwzdf00dckdquyzjzzse9','cmw7iwz5m001ekdquiemwm2hl','cmw7iwz5s001qkdquyd36v8ij',NULL,NULL,'municipal','','diaria','Todos los días','paquetes','bicielectrica',50,'active',NULL,'',1,1794123680028,1794123680028);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qq00avslco3nmwv1tt','cmw8vr0qj00alslco31e0f6c2',NULL,NULL,'cmw7iwz5k001akdqumvxavg7z','cmw7iwz6n003jkdqu2t27ojm5','provincial','Matanzas, Cienfuegos, Sancti Spíritus','diaria','Lunes, miércoles y viernes','paquetes','camion',1200,'active',NULL,'',1,1794205703043,1794205703043);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw8vr0qt00axslco9zwgy01x','cmw8vr0qj00alslco31e0f6c2',NULL,NULL,'cmw7iwz6n003jkdqu2t27ojm5','cmw7iwz840071kdqub7z0tfnr','provincial','Camagüey, Las Tunas','semanal','Viernes','paquetes','camion',1500,'scheduled',NULL,'',1,1794205703046,1794205703046);
INSERT INTO "Route"(id,courierId,originMunicipalityId,destinationMunicipalityId,originProvinceId,destinationProvinceId,scope,stops,frequency,daysNote,serviceType,vehicleType,feeCup,status,nextDepartureAt,notes,isDemo,createdAt,updatedAt) VALUES('cmw8vr0r400bcslcox301l2eo','cmw8vr0qx00b2slco8zp9r8hx',NULL,NULL,'cmw7iwz4w0000kdquslyhvi6l','cmw7iwz5k001akdqumvxavg7z','provincial','Artemisa','semanal','Martes y sábado','paquetes','panel',900,'active',NULL,'',1,1794205703056,1794205703056);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzax00ajkdquli1wxkyi','cmw7iwzaj00a3kdqutgzlu2i7',150,10,NULL,1794123679929);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzb900b1kdqu7c55lbee','cmw7iwzay00amkdqu503daoto',150,10,NULL,1794123679942);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzc900bgkdqutf5tl953','cmw7iwzbb00b4kdquy7pa70pf',150,10,NULL,1794123679978);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzcl00bxkdqu89xgk96h','cmw7iwzca00bjkdqubpzpmzh6',150,10,NULL,1794123679990);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzct00cbkdqu0pmvbx93','cmw7iwzcm00c0kdquanvctsg4',150,10,NULL,1794123679998);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzd400cskdquk62zprbq','cmw7iwzcv00cekdqu9sk1fhsy',150,10,NULL,1794123680008);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzde00d9kdqumcgx9g3t','cmw7iwzd500cvkdqur12c9kf8',150,10,NULL,1794123680018);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw7iwzdo00dskdquv2ov5xha','cmw7iwzdf00dckdquyzjzzse9',150,10,NULL,1794123680028);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw8vr0qh00aislco2zoede7k','cmw8vr0qe00acslcokirny4ab',150,10,NULL,1794205703033);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw8vr0qu00azslco8bbmdrc0','cmw8vr0qj00alslco31e0f6c2',150,10,NULL,1794205703047);
INSERT INTO "Wallet"(id,courierId,permanenceCredits,toolCredits,lastConsumedAt,updatedAt) VALUES('cmw8vr0r500beslcoaaq1sll7','cmw8vr0qx00b2slco8zp9r8hx',150,10,NULL,1794205703057);
