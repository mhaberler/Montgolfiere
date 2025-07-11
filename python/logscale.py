import numpy as np
import matplotlib.pyplot as plt

# Major tickmarks
major_ticks = [0, 1, 5, 10]

# Minor tickmarks
minor_ticks = np.arange(0, 1.1, 0.1).tolist() + list(range(1, 11))

# Create figure
fig, ax = plt.subplots()

# Set limits
ax.set_xlim(-11, 11)

# Add major tickmarks
for tick in major_ticks:
    x_pos = np.log10(abs(tick) + 1e-10) * 10 if tick != 0 else 0
    ax.plot([x_pos, x_pos], [0, 0.1], 'k-', lw=2)
    ax.text(x_pos, 0.15, f"{tick:.1f}" if tick < 1 else str(int(tick)), ha='center')

# Add minor tickmarks
for tick in minor_ticks:
    x_pos = np.log10(abs(tick) + 1e-10) * 10 if tick != 0 else 0
    ax.plot([x_pos, x_pos], [0, 0.05], 'k-', lw=1)
    if 0 <= tick < 1:
        ax.text(x_pos, 0.1, f"{tick:.1f}", ha='center', size=8)
    elif tick in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]:
        ax.text(x_pos, 0.1, str(int(tick)), ha='center', size=8)

# Remove axes
ax.set_yticks([])
ax.set_xticks([])

# Show plot
plt.show()