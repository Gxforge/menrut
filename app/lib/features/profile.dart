import 'package:flutter/material.dart';

import '../core/api.dart';

class PublicProfile extends StatelessWidget {
  const PublicProfile({super.key, required this.slug});
  final String slug;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Perfil profesional')),
    body: FutureBuilder<dynamic>(
      future: Api.call('/couriers/${Uri.encodeComponent(slug)}'),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError || snapshot.data == null) {
          return const Center(
            child: Text('Perfil no disponible o membresía vencida.'),
          );
        }
        final p = snapshot.data;
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 700),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const Icon(Icons.delivery_dining, size: 80),
                Text(
                  p['name'] as String,
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 20),
                Text(p['description'] as String),
                const SizedBox(height: 20),
                Text(p['available'] == 1 ? 'Disponible' : 'No disponible'),
                if (p['contact_phone'] != null)
                  SelectableText('Contacto: ${p['contact_phone']}'),
              ],
            ),
          ),
        );
      },
    ),
  );
}
