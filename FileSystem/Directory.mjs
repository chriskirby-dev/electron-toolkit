import fs from "fs";

export default class Directory {
    cwd = process.cwd();

    constructor(path) {
        this.cwd = path;
        this.metadata = Directory.metadata(path);
    }

    static metadata(path) {
        if (!path) {
            throw new Error("Path is required to get directory metadata.");
        }

        try {
            return fs.statSync(path);
        } catch (err) {
            throw new Error(`Failed to get directory metadata: ${err.message}`);
        }
    }

    static create(path, options = {}) {
        // Implement the logic to create a directory here
        // Use standardized variable names and improve readability
        if (!path) {
            throw new Error("Path is required to create a directory.");
        }

        try {
            fs.mkdirSync(path, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to create directory: ${err.message}`);
        }
    }

    static delete(path, options = {}) {
        if (!path) {
            throw new Error("Path is required to delete a directory.");
        }

        try {
            fs.rmdirSync(path, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to delete directory: ${err.message}`);
        }
    }

    static rename(currentPath, newPath) {
        if (!currentPath) {
            throw new Error("Current path is required to rename a directory.");
        }

        if (!newPath) {
            throw new Error("New path is required to rename a directory.");
        }

        try {
            fs.renameSync(currentPath, newPath);
        } catch (err) {
            throw new Error(`Failed to rename directory: ${err.message}`);
        }
    }

    static async read(path, options = {}) {
        if (!path) {
            throw new Error("Path is required to read a directory.");
        }

        const { filesOnly = false, dirsOnly = false } = options;

        try {
            const entries = await fs.promises.readdir(path, { withFileTypes: true });
            return entries
                .filter((entry) => {
                    if (filesOnly) return entry.isFile();
                    if (dirsOnly) return entry.isDirectory();
                    return true;
                })
                .map((entry) => entry.name);
        } catch (err) {
            throw new Error(`Failed to read directory: ${err.message}`);
        }
    }

    static empty(path) {
        if (!path) {
            throw new Error("Path is required to clear a directory.");
        }

        try {
            if (fs.existsSync(path)) {
                try {
                    fs.rmdirSync(path, { recursive: true });
                } catch (err) {
                    throw new Error(`Failed to clear directory: ${err.message}`);
                }
            }
            fs.mkdirSync(path);
        } catch (err) {
            throw new Error(`Failed to clear directory: ${err.message}`);
        }
    }

    static exists(path) {
        if (!path) {
            throw new Error("Path is required to check if a directory exists.");
        }

        return fs.existsSync(path);
    }

    static copy(source, destination) {
        if (!source) {
            throw new Error("Source path is required to copy a directory.");
        }

        if (!destination) {
            throw new Error("Destination path is required to copy a directory.");
        }

        try {
            fs.cpSync(source, destination, { recursive: true });
        } catch (err) {
            throw new Error(`Failed to copy directory: ${err.message}`);
        }
    }

    static move(source, destination) {
        if (!source) {
            throw new Error("Source path is required to move a directory.");
        }

        if (!destination) {
            throw new Error("Destination path is required to move a directory.");
        }

        try {
            fs.renameSync(source, destination);
        } catch (err) {
            throw new Error(`Failed to move directory: ${err.message}`);
        }
    }

    create(options) {
        const result = Directory.create(this.cwd, options);
        this.metadata = Directory.metadata(path);
        return result;
    }

    delete(options) {
        const result = Directory.delete(this.cwd, options);
        this.metadata = Directory.metadata(path);
        return result;
    }

    rename(newPath) {
        const result = Directory.rename(this.cwd, newPath);
        this.cwd = newPath;
        this.metadata = Directory.metadata(path);
        return result;
    }

    read(options) {
        return Directory.read(this.cwd, options);
    }

    empty() {
        return Directory.empty(this.cwd);
    }

    exists() {
        return Directory.exists(this.cwd);
    }

    copy(destination) {
        return Directory.copy(this.cwd, destination);
    }

    move(destination) {
        const result = Directory.move(this.cwd, destination);
        this.cwd = destination;
        this.metadata = Directory.metadata(path);
        return result;
    }
}
