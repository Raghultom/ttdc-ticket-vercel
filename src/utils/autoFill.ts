export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function passwordFromName(name: string): string {
  return `${slugifyName(name)}123`;
}

export function categoryCodeFromName(name: string): string {
  return name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
}

export function nextCounterCode(existingCount: number): string {
  return `C${String(existingCount + 1).padStart(2, '0')}`;
}
