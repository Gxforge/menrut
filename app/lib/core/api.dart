import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart';

class Api {
  static const base = String.fromEnvironment('API_BASE_URL');
  static Future<dynamic> call(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? data,
  }) async {
    final token = authConfigured
        ? Supabase.instance.client.auth.currentSession?.accessToken
        : null;
    final request = http.Request(method, Uri.parse('$base/api/v1$path'));
    request.headers['Content-Type'] = 'application/json';
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (data != null) request.body = jsonEncode(data);
    final response = await http.Response.fromStream(
      await request.send().timeout(const Duration(seconds: 20)),
    );
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(
        json['error']?['code'] ?? 'No se pudo completar la solicitud',
      );
    }
    return json['data'];
  }
}
