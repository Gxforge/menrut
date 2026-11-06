import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'features/home.dart';

const authUrl = String.fromEnvironment('SUPABASE_URL');
const authKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
bool get authConfigured => authUrl.isNotEmpty && authKey.isNotEmpty;
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (authConfigured) {
    await Supabase.initialize(url: authUrl, publishableKey: authKey);
  }
  runApp(const MenRutApp());
}

class MenRutApp extends StatelessWidget {
  const MenRutApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'MenRut · Conectamos caminos',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF007BDB)),
      scaffoldBackgroundColor: const Color(0xFFF5F8FC),
      fontFamily: 'Arial',
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
      ),
    ),
    home: const HomePage(),
  );
}
