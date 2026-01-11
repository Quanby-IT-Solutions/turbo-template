import 'package:flutter/material.dart';
import 'package:mobile/domain/entities/weekly_availability.dart';

/// Custom calendar widget for selecting weekly availability slots
class WeeklyAvailabilityCalendar extends StatefulWidget {
  final List<WeeklySlot> initialSlots;
  final Function(List<WeeklySlot>) onSlotsChanged;

  const WeeklyAvailabilityCalendar({
    super.key,
    required this.initialSlots,
    required this.onSlotsChanged,
  });

  @override
  State<WeeklyAvailabilityCalendar> createState() =>
      _WeeklyAvailabilityCalendarState();
}

class _WeeklyAvailabilityCalendarState
    extends State<WeeklyAvailabilityCalendar> {
  late Map<int, List<TimeSlot>> _daySlots;
  final List<int> _daysOfWeek = [1, 2, 3, 4, 5, 6, 7]; // 1=Monday, 7=Sunday

  @override
  void initState() {
    super.initState();
    _initializeSlots();
  }

  void _initializeSlots() {
    _daySlots = {};
    for (final day in _daysOfWeek) {
      _daySlots[day] = [];
    }

    // Load initial slots
    for (final slot in widget.initialSlots) {
      if (_daySlots.containsKey(slot.dayOfWeek)) {
        _daySlots[slot.dayOfWeek]!.add(
          TimeSlot(startTime: slot.startTime, endTime: slot.endTime),
        );
      }
    }

    _notifyChange();
  }

  void _notifyChange() {
    final slots = <WeeklySlot>[];
    for (final entry in _daySlots.entries) {
      for (final timeSlot in entry.value) {
        slots.add(
          WeeklySlot(
            dayOfWeek: entry.key,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
          ),
        );
      }
    }
    widget.onSlotsChanged(slots);
  }

  String _getDayDisplayName(int day) {
    switch (day) {
      case 1:
        return 'Mon';
      case 2:
        return 'Tue';
      case 3:
        return 'Wed';
      case 4:
        return 'Thu';
      case 5:
        return 'Fri';
      case 6:
        return 'Sat';
      case 7:
        return 'Sun';
      default:
        return 'Day $day';
    }
  }

  void _addSlot(int day) {
    showDialog(
      context: context,
      builder: (context) => _TimeSlotDialog(
        onSave: (startTime, endTime) {
          setState(() {
            _daySlots[day]!.add(
              TimeSlot(startTime: startTime, endTime: endTime),
            );
          });
          _notifyChange();
        },
      ),
    );
  }

  void _removeSlot(int day, int index) {
    setState(() {
      _daySlots[day]!.removeAt(index);
    });
    _notifyChange();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: _daysOfWeek.map((day) {
        final slots = _daySlots[day] ?? [];
        return _DaySlotRow(
          dayName: _getDayDisplayName(day),
          slots: slots,
          onAdd: () => _addSlot(day),
          onRemove: (index) => _removeSlot(day, index),
        );
      }).toList(),
    );
  }
}

class _DaySlotRow extends StatelessWidget {
  final String dayName;
  final List<TimeSlot> slots;
  final VoidCallback onAdd;
  final Function(int) onRemove;

  const _DaySlotRow({
    required this.dayName,
    required this.slots,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 50,
                child: Text(
                  dayName,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.add_circle_outline),
                onPressed: onAdd,
                iconSize: 20,
              ),
            ],
          ),
          if (slots.isEmpty)
            const Padding(
              padding: EdgeInsets.only(left: 50),
              child: Text(
                'No slots',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
            )
          else
            ...slots.asMap().entries.map((entry) {
              final index = entry.key;
              final slot = entry.value;
              return Padding(
                padding: const EdgeInsets.only(left: 50),
                child: Row(
                  children: [
                    Text('${slot.startTime} - ${slot.endTime}'),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline, size: 16),
                      onPressed: () => onRemove(index),
                    ),
                  ],
                ),
              );
            }),
          const Divider(),
        ],
      ),
    );
  }
}

class _TimeSlotDialog extends StatefulWidget {
  final Function(String startTime, String endTime) onSave;

  const _TimeSlotDialog({required this.onSave});

  @override
  State<_TimeSlotDialog> createState() => _TimeSlotDialogState();
}

class _TimeSlotDialogState extends State<_TimeSlotDialog> {
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);

  String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  Future<void> _selectTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _startTime : _endTime,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Time Slot'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: const Text('Start Time'),
            trailing: TextButton(
              onPressed: () => _selectTime(true),
              child: Text(_formatTime(_startTime)),
            ),
          ),
          ListTile(
            title: const Text('End Time'),
            trailing: TextButton(
              onPressed: () => _selectTime(false),
              child: Text(_formatTime(_endTime)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            widget.onSave(_formatTime(_startTime), _formatTime(_endTime));
            Navigator.pop(context);
          },
          child: const Text('Add'),
        ),
      ],
    );
  }
}

class TimeSlot {
  final String startTime;
  final String endTime;

  TimeSlot({required this.startTime, required this.endTime});
}
