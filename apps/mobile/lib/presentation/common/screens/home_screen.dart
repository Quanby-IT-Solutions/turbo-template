import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/core/constants/app_constants.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isDoctor = ref.watch(isDoctorProvider);
    final fallbackDisplayName = user?.displayName ?? 'User';
    final welcomeName = user != null && user.firstName.trim().isNotEmpty
        ? user.firstName.trim()
        : fallbackDisplayName.split(' ').first;

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, $welcomeName'),
        actions: [
          IconButton(
            icon: Stack(
              children: [
                const Icon(Icons.notifications_rounded),
                // You can add notification badge here later
                // Positioned(
                //   right: 0,
                //   top: 0,
                //   child: Container(
                //     padding: const EdgeInsets.all(2),
                //     decoration: BoxDecoration(
                //       color: Colors.red,
                //       borderRadius: BorderRadius.circular(6),
                //     ),
                //     constraints: const BoxConstraints(
                //       minWidth: 12,
                //       minHeight: 12,
                //     ),
                //     child: const Text(
                //       '3',
                //       style: TextStyle(
                //         color: Colors.white,
                //         fontSize: 8,
                //       ),
                //       textAlign: TextAlign.center,
                //     ),
                //   ),
                // ),
              ],
            ),
            onPressed: () => context.push('/notifications'),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              switch (value) {
                case 'profile':
                  context.push('/profile');
                  break;
                case 'settings':
                  // TODO: Implement settings
                  break;
                case 'help':
                  // TODO: Implement help
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person_rounded),
                  title: Text('Profile'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings_rounded),
                  title: Text('Settings'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'help',
                child: ListTile(
                  leading: Icon(Icons.help_rounded),
                  title: Text('Help & Support'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Actions Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Actions',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Prominent Video Call Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(
                            context,
                          ).colorScheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => context.push('/video-call'),
                        icon: const Icon(Icons.video_call_rounded, size: 24),
                        label: Text(
                          isDoctor ? 'Start Consultation' : 'Join Video Call',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    if (isDoctor) ...[
                      _buildQuickActionRow(context, [
                        _QuickAction(
                          icon: Icons.schedule,
                          label: 'Availability',
                          onTap: () => context.push('/doctor-availability'),
                        ),
                        _QuickAction(
                          icon: Icons.people,
                          label: 'Requests',
                          onTap: () => context.push('/appointment-requests'),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      _buildQuickActionRow(context, [
                        _QuickAction(
                          icon: Icons.face,
                          label: 'Face Scan',
                          onTap: () => context.push('/face-scan'),
                        ),
                        _QuickAction(
                          icon: Icons.medical_services,
                          label: 'Prescription',
                          onTap: () => context.push('/prescription-form'),
                        ),
                      ]),
                    ] else ...[
                      _buildQuickActionRow(context, [
                        _QuickAction(
                          icon: Icons.search,
                          label: 'Find Doctor',
                          onTap: () => context.push('/doctor-search'),
                        ),
                        _QuickAction(
                          icon: Icons.camera_alt_rounded,
                          label: 'Self-Check',
                          onTap: () => context.push('/vitals-self-check'),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      _buildQuickActionRow(context, [
                        _QuickAction(
                          icon: Icons.history,
                          label: 'History',
                          onTap: () => context.push('/consultations-history'),
                        ),
                        _QuickAction(
                          icon: Icons.trending_up_rounded,
                          label: 'Trends',
                          onTap: () => context.push('/health-trends'),
                        ),
                      ]),
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Recent Activity
            Text(
              'Recent Activity',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            Expanded(
              child: ListView(
                children: [
                  _buildActivityCard(
                    context,
                    'Consultation with Dr. Smith',
                    'Yesterday, 2:30 PM',
                    Icons.video_call,
                    () => context.push('/consultations-history'),
                  ),
                  _buildActivityCard(
                    context,
                    'Prescription for Amoxicillin',
                    '2 days ago',
                    Icons.medication,
                    () => context.push('/prescriptions'),
                  ),
                  _buildActivityCard(
                    context,
                    'Vitals Check Completed',
                    '3 days ago',
                    Icons.monitor_heart,
                    () => context.push('/health-trends'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              isDoctor ? Icons.calendar_today_rounded : Icons.search_rounded,
            ),
            label: isDoctor ? 'Schedule' : 'Find Doctors',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              isDoctor ? Icons.groups_rounded : Icons.folder_special_rounded,
            ),
            label: isDoctor ? 'Patients' : 'Records',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.notifications_rounded),
            label: 'Notifications',
          ),
        ],
        currentIndex: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              // Already on home
              break;
            case 1:
              context.push(
                isDoctor ? '/doctor-availability' : '/doctor-search',
              );
              break;
            case 2:
              context.push(isDoctor ? '/patients' : '/medical-records');
              break;
            case 3:
              context.push('/notifications');
              break;
          }
        },
      ),
    );
  }

  Widget _buildQuickActionRow(
    BuildContext context,
    List<_QuickAction> actions,
  ) {
    return Row(
      children: actions.map((action) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.1),
                foregroundColor: Theme.of(context).colorScheme.primary,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: action.onTap,
              child: Column(
                children: [
                  Icon(action.icon, size: 24),
                  const SizedBox(height: 4),
                  Text(
                    action.label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActivityCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    VoidCallback onTap,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(
            context,
          ).colorScheme.primary.withValues(alpha: 0.1),
          child: Icon(icon, color: Theme.of(context).colorScheme.primary),
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  _QuickAction({required this.icon, required this.label, required this.onTap});
}
