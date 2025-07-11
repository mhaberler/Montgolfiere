import matplotlib.pyplot as plt
import numpy as np

# Create figure and axis
fig, ax = plt.subplots(1, 1, figsize=(3, 12))

# Define the scale range
scale_min, scale_max = -10, 10

# Create the main vertical line (scale backbone)
ax.axvline(x=0, color='black', linewidth=2, ymin=0, ymax=1)

# Define logarithmic scale function
def log_scale(value):
    """Convert linear value to logarithmic scale position"""
    if value == 0:
        return 0
    sign = 1 if value > 0 else -1
    abs_val = abs(value)
    if abs_val <= 1:
        return sign * abs_val  # Linear for 0-1 range
    else:
        # Logarithmic scaling for values > 1
        return sign * (1 + np.log10(abs_val))

# Define tick positions
major_values = [-10, -5, -1, 0, 1, 5, 10]  # Major tick values
medium_values = [0.5, -0.5]  # Only 0.5 ticks (not between 1-10)
minor_values = []  # 0.1 intervals between 0 and ±1
small_integer_values = []  # Integer positions between 1-10 (small tick size)

# Generate minor ticks (0.1 intervals between 0 and ±1)
for i in range(-10, 11):  # -1.0 to 1.0 in 0.1 steps
    val = i * 0.1
    if val not in major_values and val not in medium_values and val != 0:
        minor_values.append(val)

# Generate small integer ticks (integers in range, excluding major positions)
for val in range(-10, 11):  # -10 to 10
    if val != 0 and val not in major_values and abs(val) > 1:
        small_integer_values.append(val)

# Convert to logarithmic scale positions
major_ticks = [(val, log_scale(val)) for val in major_values]
medium_ticks = [(val, log_scale(val)) for val in medium_values]
minor_ticks = [(val, log_scale(val)) for val in minor_values]
small_integer_ticks = [(val, log_scale(val)) for val in small_integer_values]

# Tick mark properties
major_tick_length = 0.3
medium_tick_length = 0.2
minor_tick_length = 0.1

# Draw major ticks (integers) with bold labels
for value, pos in major_ticks:
    ax.plot([0, major_tick_length], [pos, pos], 'k-', linewidth=2)
    ax.plot([0, -major_tick_length], [pos, pos], 'k-', linewidth=2)
    if value != 0:  # Don't label zero
        ax.text(major_tick_length + 0.05, pos, str(abs(int(value))), 
                ha='left', va='center', fontweight='bold', fontsize=12)
        ax.text(-major_tick_length - 0.05, pos, str(abs(int(value))), 
                ha='right', va='center', fontweight='bold', fontsize=12)

# Draw medium ticks (0.5 intervals, only between 0 and ±1)
for value, pos in medium_ticks:
    ax.plot([0, medium_tick_length], [pos, pos], 'k-', linewidth=1)
    ax.plot([0, -medium_tick_length], [pos, pos], 'k-', linewidth=1)

# Draw minor ticks (0.1 intervals between 0 and ±1)
for value, pos in minor_ticks:
    ax.plot([0, minor_tick_length], [pos, pos], 'k-', linewidth=0.5)
    ax.plot([0, -minor_tick_length], [pos, pos], 'k-', linewidth=0.5)

# Draw small integer ticks (integers between 1-10, same size as 0.1 ticks)
for value, pos in small_integer_ticks:
    ax.plot([0, minor_tick_length], [pos, pos], 'k-', linewidth=0.5)
    ax.plot([0, -minor_tick_length], [pos, pos], 'k-', linewidth=0.5)

# Set axis properties
scale_height = log_scale(10)
ax.set_xlim(-0.6, 0.6)
ax.set_ylim(-scale_height - 0.5, scale_height + 0.5)
ax.set_aspect('equal')

# Remove default ticks and labels
ax.set_xticks([])
ax.set_yticks([])

# Remove spines
for spine in ax.spines.values():
    spine.set_visible(False)

# Add title
ax.set_title('Vertical Speed Indicator Scale\n(m/s)', fontsize=14, pad=20)

# Add up/down arrows or labels if desired
ax.text(0, scale_height + 0.3, '↑', ha='center', va='bottom', fontsize=16, fontweight='bold')
ax.text(0, -scale_height - 0.3, '↓', ha='center', va='top', fontsize=16, fontweight='bold')

plt.tight_layout()
plt.show()