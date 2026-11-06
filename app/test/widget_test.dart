import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:menrut/features/session.dart';

void main() {
  testWidgets('No simula sesión sin Supabase', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SessionPage()));
    expect(find.textContaining('pendientes de activar'), findsOneWidget);
    expect(find.text('Iniciar sesión'), findsNothing);
  });
}
