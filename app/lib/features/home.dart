import 'notice.dart';

import 'package:flutter/material.dart';

import '../core/api.dart';
import 'session.dart';
import 'profile.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Future<dynamic> results;
  List<dynamic> provinces = [];
  String? province;
  @override
  void initState() {
    super.initState();
    results = Api.call('/directory');
    Api.call('/locations/provinces')
        .then((p) {
          if (mounted) setState(() => provinces = p as List<dynamic>);
        })
        .catchError((Object _) {});
  }

  void search() => setState(
    () => results = Api.call(
      '/directory${province == null ? '' : '?province=$province'}',
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      toolbarHeight: 80,
      backgroundColor: Colors.white,
      title: const Text(
        'MenRut',
        style: TextStyle(
          fontWeight: FontWeight.w900,
          color: Color(0xFF071C50),
          fontSize: 28,
        ),
      ),
      actions: [
        TextButton.icon(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(builder: (_) => const SessionPage()),
          ),
          icon: const Icon(Icons.person_outline),
          label: const Text('Mi cuenta'),
        ),
        const SizedBox(width: 24),
      ],
    ),
    body: SingleChildScrollView(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1160),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF071C50), Color(0xFF0069C8)],
                    ),
                  ),
                  child: LayoutBuilder(
                    builder: (context, size) => Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'HECHO PARA CONECTAR CUBA',
                                style: TextStyle(
                                  color: Color(0xFF5CDAFF),
                                  letterSpacing: 2,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                'Tu próximo envío\nempieza con una\nbuena conexión.',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: size.maxWidth > 600 ? 48 : 32,
                                  height: 1.1,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 24),
                              const Text(
                                'Encuentra mensajeros. Consulta sus servicios.\nContacta directamente, sin intermediarios.',
                                style: TextStyle(
                                  color: Color(0xFFD2E7FF),
                                  fontSize: 17,
                                  height: 1.6,
                                ),
                              ),
                              const SizedBox(height: 28),
                              FilledButton.icon(
                                onPressed: () => Navigator.push(
                                  context,
                                  MaterialPageRoute<void>(
                                    builder: (_) => const SessionPage(),
                                  ),
                                ),
                                icon: const Icon(Icons.arrow_forward),
                                label: const Text('Soy mensajero'),
                              ),
                            ],
                          ),
                        ),
                        if (size.maxWidth > 700)
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(36),
                              child: Image.asset(
                                'assets/Icono de ruta azul MENRUT.png',
                                width: 280,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Encuentra a quien te lleva más lejos',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Directorio nacional · Contacto directo · Precios en CUP',
                ),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    SizedBox(
                      width: 320,
                      child: DropdownButtonFormField<String>(
                        initialValue: province,
                        decoration: const InputDecoration(
                          labelText: 'Provincia',
                        ),
                        items: [
                          const DropdownMenuItem<String>(
                            value: null,
                            child: Text('Toda Cuba'),
                          ),
                          ...provinces.map(
                            (p) => DropdownMenuItem<String>(
                              value: p['id'] as String,
                              child: Text(p['name'] as String),
                            ),
                          ),
                        ],
                        onChanged: (p) => province = p,
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: search,
                      icon: const Icon(Icons.search),
                      label: const Text('Buscar mensajeros'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                FutureBuilder<dynamic>(
                  future: results,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const LinearProgressIndicator();
                    }
                    if (snapshot.hasError) {
                      return DirectoryNotice(
                        icon: Icons.wifi_off,
                        title: 'No pudimos cargar el directorio',
                        detail: 'Comprueba tu conexión. Ninguna solicitud se ha guardado sin conexión.',
                        action: search,
                      );
                    }
                    final items = snapshot.data['items'] as List<dynamic>;
                    if (items.isEmpty) {
                      return const DirectoryNotice(
                        icon: Icons.route_outlined,
                        title: 'Los primeros caminos están por conectar',
                        detail: 'Todavía no hay perfiles públicos vigentes en esta búsqueda. No mostramos mensajeros ficticios.',
                      );
                    }
                    return Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: items
                          .map(
                            (p) => SizedBox(
                              width: 330,
                              child: Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const CircleAvatar(
                                        child: Icon(Icons.delivery_dining),
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        p['name'] as String,
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(p['description'] as String),
                                      const SizedBox(height: 16),
                                      OutlinedButton(
                                        onPressed: () => Navigator.push(
                                          context,
                                          MaterialPageRoute<void>(
                                            builder: (_) => PublicProfile(
                                              slug: p['slug'] as String,
                                            ),
                                          ),
                                        ),
                                        child: const Text('Ver perfil'),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
                const SizedBox(height: 40),
                const Text(
                  'MenRut · Conectamos caminos.',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Versión inicial en desarrollo. Sin GPS en tiempo real ni asignación automática. Los servicios se acuerdan directamente con cada mensajero.',
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
