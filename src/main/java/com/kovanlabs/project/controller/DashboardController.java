package com.kovanlabs.project.controller;

import com.kovanlabs.project.service.DashboardService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@CrossOrigin("http://localhost:5173")
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public Object getStats() {
        try {
            return dashboardService.getStats(null);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("error", e.getMessage());
            errorMap.put("type", e.getClass().getSimpleName());
            return errorMap;
        }
    }
}
