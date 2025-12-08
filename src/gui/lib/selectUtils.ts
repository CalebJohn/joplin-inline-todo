function arrayToOptions(arr: string[]) {
	return arr.map((i) => ({
		label: i,
		value: i,
	}));
}

export function groupsToOptions(groups) {
	return Object.entries(groups).map(([g, items]) => ({
		label: g,
		options: arrayToOptions(items as string[]),
	}));
}

export function selectTheme(tagTheme: any) {
	return { ...tagTheme,
		colors: { ...tagTheme.colors,
			primary: 'var(--joplin-background-color3)',
			primary25: 'var(--joplin-background-color3)',
			neutral0: 'var(--joplin-background-color)',
			neutral5: 'var(--joplin-background-color)',
			neutral10: 'var(--joplin-divider-color)',
			neutral20: 'var(--joplin-divider-color)',
			neutral30: 'var(--joplin-divider-color)',
			neutral40: 'var(--joplin-color3)',
			neutral50: 'var(--joplin-color3)',
			neutral60: 'var(--joplin-color3)',
			neutral70: 'var(--joplin-color3)',
			neutral80: 'var(--joplin-color3)',
			neutral90: 'var(--joplin-color3)',
			danger: 'var(--joplin-background-color)',
			dangerLight: 'var(--joplin-color-error2)',
		},
	};
};

export const selectStyles = {
  option: (provided, state) => ({
    ...provided,
    color: state.isFocused ? 'var(--joplin-color3)' : 'var(--joplin-color)',
  }),
};
