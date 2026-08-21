/**
 *
 * @author kogi <astronaut.kogi@gmail.com>
 */

package com.example.m_epic;

import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.stage.DirectoryChooser;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class M_epic extends Application {

    private List<File> playlist = new ArrayList<>();
    private int currentIndex = 0;
    private MediaPlayer mediaPlayer;
    private boolean isPlaying = false;
    private boolean isShuffled = false;
    private boolean isRepeating = false;

    private ListView<String> songListView;
    private Label currentSongLabel;
    private Label timeLabel;
    private Slider progressSlider;
    private Slider volumeSlider;

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("🎵 Music Player");

        // ========== Меню ==========
        MenuBar menuBar = new MenuBar();
        Menu fileMenu = new Menu("File");
        MenuItem openFolderItem = new MenuItem("Open Folder");
        openFolderItem.setOnAction(e -> openFolder());
        MenuItem exitItem = new MenuItem("Exit");
        exitItem.setOnAction(e -> Platform.exit());
        fileMenu.getItems().addAll(openFolderItem, new SeparatorMenuItem(), exitItem);

        Menu playlistMenu = new Menu("Playlist");
        MenuItem shuffleItem = new MenuItem("Shuffle");
        shuffleItem.setOnAction(e -> shufflePlaylist());
        MenuItem repeatItem = new MenuItem("Repeat");
        repeatItem.setOnAction(e -> toggleRepeat());
        playlistMenu.getItems().addAll(shuffleItem, repeatItem);

        menuBar.getMenus().addAll(fileMenu, playlistMenu);

        // ========== Список песен ==========
        songListView = new ListView<>();
        songListView.setPrefHeight(300);
        songListView.setOnMouseClicked(e -> {
            if (e.getClickCount() == 2) {
                int index = songListView.getSelectionModel().getSelectedIndex();
                if (index >= 0 && index < playlist.size()) {
                    playSong(index);
                }
            }
        });

        // ========== Информация о песне ==========
        currentSongLabel = new Label("No song selected");
        currentSongLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 14px; -fx-text-fill: #4a9eff;");

        timeLabel = new Label("00:00 / 00:00");
        timeLabel.setStyle("-fx-font-size: 12px;");

        // ========== Прогресс ==========
        progressSlider = new Slider();
        progressSlider.setMaxWidth(Double.MAX_VALUE);
        progressSlider.setOnMouseClicked(e -> {
            if (mediaPlayer != null) {
                Duration total = mediaPlayer.getTotalDuration();
                double newTime = (progressSlider.getValue() / 100.0) * total.toSeconds();
                mediaPlayer.seek(Duration.seconds(newTime));
            }
        });

        // ========== Кнопки ==========
        Button prevButton = createIconButton("⏮");
        Button playButton = createIconButton("▶️");
        Button pauseButton = createIconButton("⏸");
        Button nextButton = createIconButton("⏭");
        Button shuffleBtn = createIconButton("🔀");
        Button repeatBtn = createIconButton("🔁");

        playButton.setOnAction(e -> playSong(currentIndex));
        pauseButton.setOnAction(e -> pauseSong());
        nextButton.setOnAction(e -> nextSong());
        prevButton.setOnAction(e -> prevSong());
        shuffleBtn.setOnAction(e -> shufflePlaylist());
        repeatBtn.setOnAction(e -> toggleRepeat());

        HBox controlBox = new HBox(10, prevButton, playButton, pauseButton, nextButton, shuffleBtn, repeatBtn);
        controlBox.setAlignment(Pos.CENTER);
        controlBox.setPadding(new Insets(10, 0, 10, 0));

        // ========== Громкость ==========
        volumeSlider = new Slider(0, 1, 0.5);
        volumeSlider.setPrefWidth(100);
        volumeSlider.valueProperty().addListener((obs, oldVal, newVal) -> {
            if (mediaPlayer != null) {
                mediaPlayer.setVolume(newVal.doubleValue());
            }
        });

        Label volumeLabel = new Label("🔊");
        HBox volumeBox = new HBox(5, volumeLabel, volumeSlider);
        volumeBox.setAlignment(Pos.CENTER_RIGHT);
        volumeBox.setPadding(new Insets(0, 10, 0, 0));

        // ========== Сборка ==========
        VBox centerBox = new VBox(10, songListView, currentSongLabel, progressSlider, timeLabel, controlBox);
        centerBox.setPadding(new Insets(10));

        BorderPane root = new BorderPane();
        root.setTop(menuBar);
        root.setCenter(centerBox);
        root.setBottom(volumeBox);

        Scene scene = new Scene(root, 600, 550);
        primaryStage.setScene(scene);
        primaryStage.show();

        // ========== Автозагрузка ==========
        try {
            // Ищем папку music
            File jarDir = new File(M_epic.class.getProtectionDomain().getCodeSource().getLocation().toURI()).getParentFile();
            File musicFolder = new File(jarDir, "music");
            
            // Если не нашли рядом с JAR, пробуем в корне проекта
            if (!musicFolder.exists()) {
                musicFolder = new File("music");
            }
            
            if (musicFolder.exists() && musicFolder.isDirectory()) {
                System.out.println("📁 Найдена папка music: " + musicFolder.getAbsolutePath());
                loadSongsFromFolder(musicFolder);
            } else {
                System.out.println("⚠️ Папка music не найдена!");
            }
        } catch (Exception e) {
            System.err.println("Ошибка автозагрузки: " + e.getMessage());
        }
    }

    // ========== Загрузка песен ==========

    private void openFolder() {
        DirectoryChooser directoryChooser = new DirectoryChooser();
        directoryChooser.setTitle("Select Music Folder");
        File selectedDirectory = directoryChooser.showDialog(null);
        if (selectedDirectory != null && selectedDirectory.isDirectory()) {
            loadSongsFromFolder(selectedDirectory);
        }
    }

    private void loadSongsFromFolder(File folder) {
        System.out.println("📂 Загрузка из папки: " + folder.getAbsolutePath());
    
        List<File> ordered = loadPlaylistFromFile(folder);
    
        if (!ordered.isEmpty()) {
            playlist = ordered;
        } else {
            playlist = loadAllSongsFromFolder(folder);
        }
    
        updateSongList();
    
        if (!playlist.isEmpty()) {
            songListView.getSelectionModel().select(0);
            currentSongLabel.setText("⏸ " + playlist.get(0).getName());
            System.out.println("🎵 Загружено " + playlist.size() + " песен. Нажмите Play, чтобы начать.");
        }
    }

    private List<File> loadAllSongsFromFolder(File folder) {
        List<File> songs = new ArrayList<>();
        File[] files = folder.listFiles((dir, name) -> isMusicFile(new File(dir, name)));
        
        if (files != null) {
            for (File file : files) {
                songs.add(file);
            }
        }
        
        System.out.println("🎵 Загружено " + songs.size() + " песен из папки");
        return songs;
    }

    private List<File> loadPlaylistFromFile(File musicFolder) {
        List<File> ordered = new ArrayList<>();
        
        // Ищем playlist.txt в папке с музыкой или на уровень выше
        File playlistFile = new File(musicFolder, "playlist.txt");
        if (!playlistFile.exists()) {
            playlistFile = new File(musicFolder.getParent(), "playlist.txt");
        }
        if (!playlistFile.exists()) {
            playlistFile = new File("playlist.txt");
        }
        
        if (!playlistFile.exists()) {
            System.out.println("ℹ️ playlist.txt не найден, загружаем все MP3");
            return ordered;
        }
        
        System.out.println("📄 Найден playlist.txt: " + playlistFile.getAbsolutePath());
        
        try (BufferedReader reader = new BufferedReader(new FileReader(playlistFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                
                File song = new File(musicFolder, line);
                if (song.exists() && isMusicFile(song)) {
                    ordered.add(song);
                    System.out.println("  ✅ " + line);
                } else {
                    System.out.println("  ⚠️ Песня не найдена: " + line);
                }
            }
            System.out.println("📋 Загружено " + ordered.size() + " песен из playlist.txt");
        } catch (IOException e) {
            System.err.println("Ошибка чтения playlist.txt: " + e.getMessage());
        }
        
        return ordered;
    }

    private boolean isMusicFile(File file) {
        String name = file.getName().toLowerCase();
        return name.endsWith(".mp3") ||
               name.endsWith(".wav") ||
               name.endsWith(".flac") ||
               name.endsWith(".m4a");
    }

    private void updateSongList() {
        songListView.getItems().clear();
        for (File song : playlist) {
            songListView.getItems().add(song.getName());
        }
    }

    // ========== Воспроизведение ==========

    private void playSong(int index) {
        if (playlist.isEmpty()) return;
        if (index < 0 || index >= playlist.size()) return;

        if (mediaPlayer != null) {
            mediaPlayer.stop();
            mediaPlayer.dispose();
            mediaPlayer = null;
        }

        currentIndex = index;
        File song = playlist.get(currentIndex);

        try {
            Media media = new Media(song.toURI().toString());
            mediaPlayer = new MediaPlayer(media);
            mediaPlayer.setVolume(volumeSlider.getValue());

            mediaPlayer.setOnReady(() -> {
                Duration total = mediaPlayer.getTotalDuration();
                progressSlider.setMax(100);
                updateTimeLabel(Duration.ZERO, total);
            });

            mediaPlayer.currentTimeProperty().addListener((obs, oldVal, newVal) -> {
                Duration total = mediaPlayer.getTotalDuration();
                double progress = (newVal.toSeconds() / total.toSeconds()) * 100;
                progressSlider.setValue(progress);
                updateTimeLabel(newVal, total);
            });

            mediaPlayer.setOnEndOfMedia(() -> {
                if (isRepeating) {
                    playSong(currentIndex);
                } else {
                    nextSong();
                }
            });

            mediaPlayer.play();
            isPlaying = true;
            currentSongLabel.setText("▶️ " + song.getName());

            songListView.getSelectionModel().select(currentIndex);
            songListView.scrollTo(currentIndex);

        } catch (Exception e) {
            System.err.println("Ошибка воспроизведения: " + e.getMessage());
        }
    }

    private void pauseSong() {
        if (mediaPlayer != null) {
            if (isPlaying) {
                mediaPlayer.pause();
                isPlaying = false;
                currentSongLabel.setText("⏸ " + playlist.get(currentIndex).getName());
            } else {
                mediaPlayer.play();
                isPlaying = true;
                currentSongLabel.setText("▶️ " + playlist.get(currentIndex).getName());
            }
        }
    }

    private void nextSong() {
        if (playlist.isEmpty()) return;
        int nextIndex = (currentIndex + 1) % playlist.size();
        playSong(nextIndex);
    }

    private void prevSong() {
        if (playlist.isEmpty()) return;
        int prevIndex = (currentIndex - 1 + playlist.size()) % playlist.size();
        playSong(prevIndex);
    }

    // ========== Дополнительно ==========

    private void shufflePlaylist() {
        if (playlist.isEmpty()) return;
        Collections.shuffle(playlist);
        updateSongList();
        currentIndex = 0;
        playSong(0);
        isShuffled = true;
    }

    private void toggleRepeat() {
        isRepeating = !isRepeating;
        System.out.println("🔁 Repeat: " + (isRepeating ? "ON" : "OFF"));
    }

    private void updateTimeLabel(Duration current, Duration total) {
        String currentStr = formatTime(current);
        String totalStr = formatTime(total);
        timeLabel.setText(currentStr + " / " + totalStr);
    }

    private String formatTime(Duration duration) {
        if (duration == null || duration.isUnknown()) return "00:00";
        long minutes = (long) duration.toMinutes();
        long seconds = (long) duration.toSeconds() % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    private Button createIconButton(String icon) {
        Button btn = new Button(icon);
        btn.setStyle("-fx-font-size: 18px; -fx-background-color: transparent; -fx-cursor: hand;");
        btn.setPrefSize(45, 45);
        return btn;
    }

    // ========== Запуск ==========

    public static void main(String[] args) {
        launch(args);
    }
}
