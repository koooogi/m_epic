/**
 *
 * @author kogi <astronaut.kogi@gmail.com>
 */
package com.example.m_epic;

public class Song {
    private String name;
    private String fileName;
    private String path;
    
    public Song(String name, String fileName, String path) {
        this.name = name;
        this.fileName = fileName;
        this.path = path;
    }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
}
