import 'package:flutter/material.dart';

class DirectoryNotice extends StatelessWidget {
  const DirectoryNotice({
    super.key,
    required this.icon,
    required this.title,
    required this.detail,
    this.action,
  });
  final IconData icon;
  final String title, detail;
  final VoidCallback? action;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(32),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      children: [
        Icon(icon, size: 48, color: const Color(0xFF007BDB)),
        const SizedBox(height: 16),
        Text(
          title,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Text(detail, textAlign: TextAlign.center),
        if (action != null)
          TextButton(onPressed: action, child: const Text('Reintentar')),
      ],
    ),
  );
}
