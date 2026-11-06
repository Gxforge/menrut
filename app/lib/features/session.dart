import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart';
import '../core/api.dart';

class SessionPage extends StatefulWidget {
  const SessionPage({super.key});
  @override
  State<SessionPage> createState() => _SessionPageState();
}

class _SessionPageState extends State<SessionPage> {
  final email = TextEditingController(), password = TextEditingController();
  String? message;
  bool busy = false;
  dynamic account;
  Future<void> run(Future<void> Function() operation) async {
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await operation();
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              message = 'No se pudo completar. Revisa tus datos y la conexión.',
        );
      }
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final logged =
        authConfigured && Supabase.instance.client.auth.currentSession != null;
    return Scaffold(
      appBar: AppBar(title: const Text('Tu espacio MenRut')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Conectamos caminos.',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 24),
              if (!authConfigured)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Registro e inicio de sesión pendientes de activar: es necesario seleccionar y reactivar el proyecto Supabase. No se enviarán tus datos ni se simulará una sesión.',
                    ),
                  ),
                ),
              if (authConfigured && !logged) ...[
                TextField(
                  controller: email,
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico',
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Contraseña'),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          await Supabase.instance.client.auth
                              .signInWithPassword(
                                email: email.text.trim(),
                                password: password.text,
                              );
                        }),
                  child: const Text('Iniciar sesión'),
                ),
                OutlinedButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          await Supabase.instance.client.auth.signUp(
                            email: email.text.trim(),
                            password: password.text,
                          );
                          setState(
                            () => message =
                                'Revisa tu correo para confirmar el registro.',
                          );
                        }),
                  child: const Text('Crear cuenta'),
                ),
                TextButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          await Supabase.instance.client.auth
                              .resetPasswordForEmail(email.text.trim());
                          setState(
                            () => message = 'Si existe la cuenta, recibirás las instrucciones.',
                          );
                        }),
                  child: const Text('Recuperar contraseña'),
                ),
              ],
              if (logged) ...[
                FilledButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          final result = await Api.call(
                            '/onboarding/courier',
                            method: 'POST',
                            data: {},
                          );
                          setState(
                            () => message =
                                result['trial_requires_verification'] == true
                                ? 'Perfil creado. La prueba requiere verificar tu identidad.'
                                : 'Perfil creado. Prueba activa.',
                          );
                        }),
                  child: const Text('Activar mi perfil de mensajero'),
                ),
                OutlinedButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          final result = await Api.call('/credits/wallets');
                          setState(() => account = result);
                        }),
                  child: const Text('Consultar mis carteras'),
                ),
                if (account != null)
                  Text(
                    'Permanencia: ${(account['permanence_seconds'] / 8640).toStringAsFixed(3)} créditos\nHerramientas: ${account['tool_credits']} créditos',
                  ),
                TextButton(
                  onPressed: busy
                      ? null
                      : () => run(() async {
                          await Supabase.instance.client.auth.signOut();
                          setState(() => account = null);
                        }),
                  child: const Text('Cerrar sesión'),
                ),
              ],
              if (busy) const LinearProgressIndicator(),
              if (message != null)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(message!),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
